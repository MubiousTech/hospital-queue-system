import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ID, Query } from 'appwrite';
import { databases, DB_ID, COLLECTIONS } from './appwrite.config';
import {
  Patient,
  QueueEntry,
  PatientPriority,
  QueueStatus,
  QueueStats,
  MedicalConditions,
  VitalSigns,
} from '../models/patient.model';
import { PatientServiceTs } from './patient.service.ts';

@Injectable({
  providedIn: 'root',
})

export class Queue {
   private readonly AVERAGE_SERVICE_TIME = 15;

  private queueSubject: BehaviorSubject<QueueEntry[]>;
  public queue$: Observable<QueueEntry[]>;

  constructor(private patientService: PatientServiceTs) {
    this.queueSubject = new BehaviorSubject<QueueEntry[]>([]);
    this.queue$ = this.queueSubject.asObservable();
    this.loadQueue();
  }

  // ─────────────────────────────────────────────
  // LOAD QUEUE FROM APPWRITE
  // ─────────────────────────────────────────────

  async loadQueue(): Promise<void> {
    try {
      const entriesResult = await databases.listDocuments(
        DB_ID,
        COLLECTIONS.QUEUE_ENTRIES,
        [Query.limit(100)]
      );

      const activeEntries = entriesResult.documents.filter(
        (doc) =>
          doc['status'] === QueueStatus.WAITING ||
          doc['status'] === QueueStatus.IN_PROGRESS ||
          doc['status'] === QueueStatus.COMPLETED
      );

      if (activeEntries.length === 0) {
        await this.seedMockData();
        return this.loadQueue();
      }

      const entries: QueueEntry[] = await Promise.all(
        activeEntries.map((doc) => this.documentToQueueEntry(doc))
      );

      this.sortAndUpdateLocal(entries);
      await this.cleanupStalePatients();

      console.log(`✅ Queue loaded: ${entries.length} entries`);
    } catch (error) {
      console.error('Failed to load queue:', error);
    }
  }

  getCurrentQueue(): QueueEntry[] {
    return this.queueSubject.value;
  }

  private async cleanupStalePatients(): Promise<void> {
    const currentQueue = this.getCurrentQueue();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    for (const entry of currentQueue) {
      const arrivalTime = new Date(entry.arrivalTime);
      const isFromPreviousDay = arrivalTime < startOfToday;

      if (entry.status === QueueStatus.WAITING && isFromPreviousDay) {
        try {
          await databases.updateDocument(DB_ID, COLLECTIONS.QUEUE_ENTRIES, entry.id, {
            status: QueueStatus.CANCELLED,
          });
          entry.status = QueueStatus.CANCELLED;
        } catch (error) {
          console.error('Failed to cancel stale patient:', error);
        }
      }

      if (entry.status === QueueStatus.IN_PROGRESS && isFromPreviousDay) {
        try {
          await databases.updateDocument(DB_ID, COLLECTIONS.QUEUE_ENTRIES, entry.id, {
            status: QueueStatus.COMPLETED,
          });
          entry.status = QueueStatus.COMPLETED;
        } catch (error) {
          console.error('Failed to auto-complete stale patient:', error);
        }
      }
    }

    this.sortAndUpdateLocal(currentQueue);
  }

  // ─────────────────────────────────────────────
  // ADD EXISTING PATIENT TO QUEUE
  // Patient must already exist (created by Record Officer via PatientService).
  // This creates a MedicalRecord for THIS visit, then a QueueEntry referencing both.
  // ─────────────────────────────────────────────

  async addToQueue(
    patient: Patient,
    priority: PatientPriority,
    medicalCondition: MedicalConditions,
    symptoms: string,
    vitalSigns?: VitalSigns,
    nurseNotes?: string,
  ): Promise<QueueEntry> {
    try {
      const arrivalTime = new Date();
      const priorityScore = this.calculatePriorityScore(priority, arrivalTime);

      // Step 1: Create a MedicalRecord for this visit (triage info)
      const medicalRecord = await this.patientService.createMedicalRecord({
        patientId: patient.id,
        visitDate: arrivalTime,
        medicalCondition,
        symptoms,
        vitalSigns,
        nurseNotes,
        priority,
      });

      // Step 2: Create the queue entry, referencing both patient and record
      const queueDoc = await databases.createDocument(
        DB_ID,
        COLLECTIONS.QUEUE_ENTRIES,
        ID.unique(),
        {
          patientId: patient.id,
          medicalRecordId: medicalRecord.id,
          priority,
          priorityScore,
          queuePosition: 0,
          arrivalTime: arrivalTime.toISOString(),
          estimatedWaitTime: 0,
          status: QueueStatus.WAITING,
          assignedDoctor: null,
          notes: nurseNotes || null,
        },
      );

      const queueEntry: QueueEntry = {
        id: queueDoc.$id,
        patientId: patient.id,
        patient,
        medicalRecordId: medicalRecord.id,
        priority,
        priorityScore,
        queuePosition: 0,
        arrivalTime,
        estimatedWaitTime: 0,
        status: QueueStatus.WAITING,
        notes: nurseNotes,
      };

      const currentQueue = this.getCurrentQueue();
      currentQueue.push(queueEntry);
      this.sortAndUpdateLocal(currentQueue);

      console.log(`✅ Patient ${patient.firstName} added to queue`);
      return queueEntry;
    } catch (error) {
      console.error('Failed to add patient to queue:', error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────
  // CALL NEXT PATIENT
  // ─────────────────────────────────────────────

  async callNextPatient(doctorName: string): Promise<QueueEntry | null> {
    const waitingPatients = this.getCurrentQueue().filter((e) => e.status === QueueStatus.WAITING);
    if (waitingPatients.length === 0) return null;

    const nextPatient = waitingPatients[0];

    try {
      await databases.updateDocument(DB_ID, COLLECTIONS.QUEUE_ENTRIES, nextPatient.id, {
        status: QueueStatus.IN_PROGRESS,
        assignedDoctor: doctorName,
      });

      // Also tag the medical record with the assigned doctor
      if (nextPatient.medicalRecordId) {
        await this.patientService.updateMedicalRecord(nextPatient.medicalRecordId, {
          assignedDoctor: doctorName,
        });
      }

      nextPatient.status = QueueStatus.IN_PROGRESS;
      nextPatient.assignedDoctor = doctorName;

      const currentQueue = this.getCurrentQueue();
      this.sortAndUpdateLocal(currentQueue);

      return nextPatient;
    } catch (error) {
      console.error('Failed to call next patient:', error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────
  // COMPLETE PATIENT
  // ─────────────────────────────────────────────

  async completePatient(queueEntryId: string): Promise<void> {
    try {
      await databases.updateDocument(DB_ID, COLLECTIONS.QUEUE_ENTRIES, queueEntryId, {
        status: QueueStatus.COMPLETED,
      });

      const currentQueue = this.getCurrentQueue();
      const entry = currentQueue.find((e) => e.id === queueEntryId);
      if (entry) {
        entry.status = QueueStatus.COMPLETED;
        this.sortAndUpdateLocal(currentQueue);
      }
    } catch (error) {
      console.error('Failed to complete patient:', error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────
  // REMOVE FROM QUEUE
  // ─────────────────────────────────────────────

  async removeFromQueue(queueEntryId: string): Promise<void> {
    try {
      await databases.updateDocument(DB_ID, COLLECTIONS.QUEUE_ENTRIES, queueEntryId, {
        status: QueueStatus.CANCELLED,
      });

      const currentQueue = this.getCurrentQueue();
      const entry = currentQueue.find((e) => e.id === queueEntryId);
      if (entry) {
        entry.status = QueueStatus.CANCELLED;
        this.sortAndUpdateLocal(currentQueue);
      }
    } catch (error) {
      console.error('Failed to remove patient:', error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────
  // QUEUE STATS
  // ─────────────────────────────────────────────

  getQueueStats(): QueueStats {
    const currentQueue = this.getCurrentQueue();
    const waitingPatients = currentQueue.filter((e) => e.status === QueueStatus.WAITING);
    const completedToday = currentQueue.filter((e) => e.status === QueueStatus.COMPLETED);

    const waitTimes = waitingPatients.map((e) => {
      const now = new Date();
      const arrival = new Date(e.arrivalTime);
      return Math.floor((now.getTime() - arrival.getTime()) / 60000);
    });

    return {
      totalPatients: currentQueue.filter(
        (e) => e.status === QueueStatus.WAITING || e.status === QueueStatus.IN_PROGRESS,
      ).length,
      criticalCount: waitingPatients.filter((e) => e.priority === PatientPriority.CRITICAL).length,
      regularCount: waitingPatients.filter((e) => e.priority === PatientPriority.REGULAR).length,
      delayedCount: waitingPatients.filter((e) => e.priority === PatientPriority.DELAYED).length,
      averageWaitTime:
        waitTimes.length > 0
          ? Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length)
          : 0,
      longestWaitTime: waitTimes.length > 0 ? Math.max(...waitTimes) : 0,
      patientsServedToday: completedToday.length,
      totalInQueue: waitingPatients.length,
    };
  }

  // ─────────────────────────────────────────────
  // PRIORITY ALGORITHM (unchanged)
  // ─────────────────────────────────────────────

  private calculatePriorityScore(priority: PatientPriority, arrivalTime: Date): number {
    const priorityWeights = {
      [PatientPriority.CRITICAL]: 3,
      [PatientPriority.REGULAR]: 2,
      [PatientPriority.DELAYED]: 1,
    };
    const now = new Date();
    const waitTimeMinutes = Math.floor((now.getTime() - arrivalTime.getTime()) / 60000);
    return priorityWeights[priority] * 1000 + waitTimeMinutes;
  }

  private sortAndUpdateLocal(queue: QueueEntry[]): void {
    const waiting = queue.filter((e) => e.status === QueueStatus.WAITING);
    const inProgress = queue.filter((e) => e.status === QueueStatus.IN_PROGRESS);
    const completed = queue.filter((e) => e.status === QueueStatus.COMPLETED);
    const cancelled = queue.filter((e) => e.status === QueueStatus.CANCELLED);

    waiting.forEach((e) => {
      e.priorityScore = this.calculatePriorityScore(e.priority, new Date(e.arrivalTime));
    });

    waiting.sort((a, b) => b.priorityScore - a.priorityScore);

    waiting.forEach((entry, index) => {
      entry.queuePosition = index + 1;
      entry.estimatedWaitTime = (index + 1) * this.AVERAGE_SERVICE_TIME;
    });

    this.queueSubject.next([...waiting, ...inProgress, ...completed, ...cancelled]);
  }

  // ─────────────────────────────────────────────
  // CONVERT APPWRITE DOCUMENT TO QUEUE ENTRY
  // ─────────────────────────────────────────────

  private async documentToQueueEntry(doc: any): Promise<QueueEntry> {
    const patient = await this.patientService.getPatientById(doc['patientId']);

    return {
      id: doc.$id,
      patientId: doc['patientId'],
      patient,
      medicalRecordId: doc['medicalRecordId'] || undefined,
      priority: doc['priority'] as PatientPriority,
      priorityScore: doc['priorityScore'],
      queuePosition: doc['queuePosition'],
      arrivalTime: new Date(doc['arrivalTime']),
      estimatedWaitTime: doc['estimatedWaitTime'],
      status: doc['status'] as QueueStatus,
      assignedDoctor: doc['assignedDoctor'] || undefined,
      notes: doc['notes'] || undefined,
    };
  }

  // ─────────────────────────────────────────────
  // SEED MOCK DATA — now creates real Patients via PatientService first,
  // so the new search-based triage flow has someone to find.
  // ─────────────────────────────────────────────

  private async seedMockData(): Promise<void> {
    console.log('🌱 Seeding mock patients + queue data...');

    const mockData = [
      {
        firstName: 'Adewale', lastName: 'Okafor', age: 45, gender: 'Male' as const,
        phoneNumber: '08012345678',
        medicalCondition: MedicalConditions.CARDIAC_ARREST,
        symptoms: 'Severe chest pain, shortness of breath',
        priority: PatientPriority.CRITICAL,
        arrivalOffset: 30,
        vitalSigns: { bloodPressure: '160/100', heartRate: 110, temperature: 37.2, oxygenSaturation: 88 },
      },
      {
        firstName: 'Chioma', lastName: 'Nwosu', age: 28, gender: 'Female' as const,
        phoneNumber: '08087654321',
        medicalCondition: MedicalConditions.ROUTINE_CHECKUP,
        symptoms: 'Annual health checkup',
        priority: PatientPriority.DELAYED,
        arrivalOffset: 45,
        vitalSigns: undefined,
      },
      {
        firstName: 'Ibrahim', lastName: 'Mohammed', age: 62, gender: 'Male' as const,
        phoneNumber: '08098765432',
        medicalCondition: MedicalConditions.FEVER,
        symptoms: 'High fever for 2 days, body aches',
        priority: PatientPriority.REGULAR,
        arrivalOffset: 20,
        vitalSigns: { bloodPressure: '130/85', heartRate: 95, temperature: 39.5, oxygenSaturation: 96 },
      },
      {
        firstName: 'Blessing', lastName: 'Eze', age: 35, gender: 'Female' as const,
        phoneNumber: '08076543210',
        medicalCondition: MedicalConditions.SEVERE_TRAUMA,
        symptoms: 'Car accident - multiple injuries',
        priority: PatientPriority.CRITICAL,
        arrivalOffset: 10,
        vitalSigns: { bloodPressure: '90/60', heartRate: 120, temperature: 36.8, oxygenSaturation: 90 },
      },
    ];

    for (const mock of mockData) {
      const arrivalTime = new Date(Date.now() - mock.arrivalOffset * 60000);

      // Create a real, permanent Patient record via PatientService
      const patient = await this.patientService.createPatient({
        firstName: mock.firstName,
        lastName: mock.lastName,
        age: mock.age,
        gender: mock.gender,
        phoneNumber: mock.phoneNumber,
      });

      // Create the visit's MedicalRecord
      const medicalRecord = await this.patientService.createMedicalRecord({
        patientId: patient.id,
        visitDate: arrivalTime,
        medicalCondition: mock.medicalCondition,
        symptoms: mock.symptoms,
        vitalSigns: mock.vitalSigns,
        priority: mock.priority,
      });

      // Create the queue entry referencing both
      await databases.createDocument(DB_ID, COLLECTIONS.QUEUE_ENTRIES, ID.unique(), {
        patientId: patient.id,
        medicalRecordId: medicalRecord.id,
        priority: mock.priority,
        priorityScore: this.calculatePriorityScore(mock.priority, arrivalTime),
        queuePosition: 0,
        arrivalTime: arrivalTime.toISOString(),
        estimatedWaitTime: 0,
        status: QueueStatus.WAITING,
        assignedDoctor: null,
        notes: null,
      });
    }

    console.log('✅ Mock data seeded successfully');
  }
}
