import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { ID, Query } from 'appwrite';
import { databases, DB_ID, COLLECTIONS } from './appwrite.config';
import {
  Patient,
  QueueEntry,
  PatientPriority,
  QueueStatus,
  QueueStats,
  MedicalConditions,
} from '../models/patient.model';

@Injectable({
  providedIn: 'root',
})
export class Queue {
  private readonly AVERAGE_SERVICE_TIME = 15;

  private queueSubject: BehaviorSubject<QueueEntry[]>;
  public queue$: Observable<QueueEntry[]>;

  constructor() {
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

    // Count only active entries (not cancelled) for seed check
    const activeEntries = entriesResult.documents.filter(
      (doc) =>
        doc['status'] === QueueStatus.WAITING ||
        doc['status'] === QueueStatus.IN_PROGRESS ||
        doc['status'] === QueueStatus.COMPLETED
    );

    // Seed only if no active entries exist
    if (activeEntries.length === 0) {
      await this.seedMockData();
      return this.loadQueue();
    }

    const entries: QueueEntry[] = await Promise.all(
      activeEntries.map((doc) => this.documentToQueueEntry(doc))
    );

    this.sortAndUpdateLocal(entries);

    // Clean up stale patients after loading
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
    const now = new Date();

    // Only clean up patients from previous days, not today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    for (const entry of currentQueue) {
      const arrivalTime = new Date(entry.arrivalTime);
      const isFromPreviousDay = arrivalTime < startOfToday;

      // Auto-cancel WAITING patients from previous days
      if (entry.status === QueueStatus.WAITING && isFromPreviousDay) {
        try {
          await databases.updateDocument(DB_ID, COLLECTIONS.QUEUE_ENTRIES, entry.id, {
            status: QueueStatus.CANCELLED,
          });
          entry.status = QueueStatus.CANCELLED;
          console.log(`🚫 Auto-cancelled previous day patient: ${entry.patient.firstName}`);
        } catch (error) {
          console.error('Failed to cancel stale patient:', error);
        }
      }

      // Auto-complete IN_PROGRESS patients from previous days
      if (entry.status === QueueStatus.IN_PROGRESS && isFromPreviousDay) {
        try {
          await databases.updateDocument(DB_ID, COLLECTIONS.QUEUE_ENTRIES, entry.id, {
            status: QueueStatus.COMPLETED,
          });
          entry.status = QueueStatus.COMPLETED;
          console.log(`✅ Auto-completed previous day patient: ${entry.patient.firstName}`);
        } catch (error) {
          console.error('Failed to auto-complete stale patient:', error);
        }
      }
    }

    this.sortAndUpdateLocal(currentQueue);
  }

  // ─────────────────────────────────────────────
  // ADD PATIENT TO QUEUE
  // ─────────────────────────────────────────────

  async addToQueue(
    patient: Patient,
    priority: PatientPriority,
    nurseNotes?: string,
  ): Promise<QueueEntry> {
    try {
      // Step 1: Save patient to patients collection
      const patientDoc = await databases.createDocument(DB_ID, COLLECTIONS.PATIENTS, ID.unique(), {
        firstName: patient.firstName,
        lastName: patient.lastName,
        age: patient.age,
        gender: patient.gender,
        phoneNumber: patient.phoneNumber,
        email: patient.email || null,
        medicalCondition: patient.medicalCondition,
        symptoms: patient.symptoms,
        registrationDate: new Date().toISOString(),
        bloodPressure: patient.vitalSigns?.bloodPressure || null,
        heartRate: patient.vitalSigns?.heartRate || null,
        temperature: patient.vitalSigns?.temperature || null,
        oxygenSaturation: patient.vitalSigns?.oxygenSaturation || null,
      });

      const arrivalTime = new Date();
      const priorityScore = this.calculatePriorityScore(priority, arrivalTime);

      // Step 2: Save queue entry to queue_entries collection
      const queueDoc = await databases.createDocument(
        DB_ID,
        COLLECTIONS.QUEUE_ENTRIES,
        ID.unique(),
        {
          patientId: patientDoc.$id,
          priority: priority,
          priorityScore: priorityScore,
          queuePosition: 0,
          arrivalTime: arrivalTime.toISOString(),
          estimatedWaitTime: 0,
          status: QueueStatus.WAITING,
          assignedDoctor: null,
          notes: nurseNotes || null,
        },
      );

      // Step 3: Build local QueueEntry object
      const queueEntry: QueueEntry = {
        id: queueDoc.$id,
        patient: { ...patient, id: patientDoc.$id },
        priority,
        priorityScore,
        queuePosition: 0,
        arrivalTime,
        estimatedWaitTime: 0,
        status: QueueStatus.WAITING,
        notes: nurseNotes,
      };

      // Step 4: Add to local state and resort
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

    // Recalculate scores and positions for waiting patients only
    waiting.forEach((e) => {
      e.priorityScore = this.calculatePriorityScore(e.priority, new Date(e.arrivalTime));
    });

    waiting.sort((a, b) => b.priorityScore - a.priorityScore);

    waiting.forEach((entry, index) => {
      entry.queuePosition = index + 1;
      entry.estimatedWaitTime = (index + 1) * this.AVERAGE_SERVICE_TIME;
    });

    // Emit all entries so UI can show full picture
    this.queueSubject.next([...waiting, ...inProgress, ...completed, ...cancelled]);
  }

  // ─────────────────────────────────────────────
  // CONVERT APPWRITE DOCUMENT TO QUEUE ENTRY
  // ─────────────────────────────────────────────

  private async documentToQueueEntry(doc: any): Promise<QueueEntry> {
    // Fetch patient document
    const patientDoc = await databases.getDocument(DB_ID, COLLECTIONS.PATIENTS, doc['patientId']);

    const patient: Patient = {
      id: patientDoc.$id,
      firstName: patientDoc['firstName'],
      lastName: patientDoc['lastName'],
      age: patientDoc['age'],
      gender: patientDoc['gender'],
      phoneNumber: patientDoc['phoneNumber'],
      email: patientDoc['email'] || undefined,
      medicalCondition: patientDoc['medicalCondition'],
      symptoms: patientDoc['symptoms'],
      registrationDate: new Date(patientDoc['registrationDate']),
      vitalSigns: patientDoc['bloodPressure']
        ? {
            bloodPressure: patientDoc['bloodPressure'],
            heartRate: patientDoc['heartRate'],
            temperature: patientDoc['temperature'],
            oxygenSaturation: patientDoc['oxygenSaturation'],
          }
        : undefined,
    };

    return {
      id: doc.$id,
      patient,
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
  // SEED MOCK DATA (only runs if collection empty)
  // ─────────────────────────────────────────────

  private async seedMockData(): Promise<void> {
    console.log('🌱 Seeding mock queue data...');

    const mockPatients = [
      {
        firstName: 'Adewale',
        lastName: 'Okafor',
        age: 45,
        gender: 'Male',
        phoneNumber: '08012345678',
        medicalCondition: MedicalConditions.CARDIAC_ARREST,
        symptoms: 'Severe chest pain, shortness of breath',
        priority: PatientPriority.CRITICAL,
        arrivalOffset: 30,
        vitalSigns: {
          bloodPressure: '160/100',
          heartRate: 110,
          temperature: 37.2,
          oxygenSaturation: 88,
        },
      },
      {
        firstName: 'Chioma',
        lastName: 'Nwosu',
        age: 28,
        gender: 'Female',
        phoneNumber: '08087654321',
        medicalCondition: MedicalConditions.ROUTINE_CHECKUP,
        symptoms: 'Annual health checkup',
        priority: PatientPriority.DELAYED,
        arrivalOffset: 45,
        vitalSigns: null,
      },
      {
        firstName: 'Ibrahim',
        lastName: 'Mohammed',
        age: 62,
        gender: 'Male',
        phoneNumber: '08098765432',
        medicalCondition: MedicalConditions.FEVER,
        symptoms: 'High fever for 2 days, body aches',
        priority: PatientPriority.REGULAR,
        arrivalOffset: 20,
        vitalSigns: {
          bloodPressure: '130/85',
          heartRate: 95,
          temperature: 39.5,
          oxygenSaturation: 96,
        },
      },
      {
        firstName: 'Blessing',
        lastName: 'Eze',
        age: 35,
        gender: 'Female',
        phoneNumber: '08076543210',
        medicalCondition: MedicalConditions.SEVERE_TRAUMA,
        symptoms: 'Car accident - multiple injuries',
        priority: PatientPriority.CRITICAL,
        arrivalOffset: 10,
        vitalSigns: {
          bloodPressure: '90/60',
          heartRate: 120,
          temperature: 36.8,
          oxygenSaturation: 90,
        },
      },
    ];

    for (const mock of mockPatients) {
      const arrivalTime = new Date(Date.now() - mock.arrivalOffset * 60000);

      const patientDoc = await databases.createDocument(DB_ID, COLLECTIONS.PATIENTS, ID.unique(), {
        firstName: mock.firstName,
        lastName: mock.lastName,
        age: mock.age,
        gender: mock.gender,
        phoneNumber: mock.phoneNumber,
        email: null,
        medicalCondition: mock.medicalCondition,
        symptoms: mock.symptoms,
        registrationDate: arrivalTime.toISOString(),
        bloodPressure: mock.vitalSigns?.bloodPressure || null,
        heartRate: mock.vitalSigns?.heartRate || null,
        temperature: mock.vitalSigns?.temperature || null,
        oxygenSaturation: mock.vitalSigns?.oxygenSaturation || null,
      });

      await databases.createDocument(DB_ID, COLLECTIONS.QUEUE_ENTRIES, ID.unique(), {
        patientId: patientDoc.$id,
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
