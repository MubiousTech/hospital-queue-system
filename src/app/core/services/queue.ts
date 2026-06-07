import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Patient, QueueEntry, PatientPriority, QueueStatus, QueueStats, MedicalConditions } from '../models/patient.model';

@Injectable({
  providedIn: 'root',
})
export class Queue {
  // Average time to attend one patient (minutes)
  private readonly AVERAGE_SERVICE_TIME = 15;

  // BehaviorSubject for reactive queue updates
  private queueSubject: BehaviorSubject<QueueEntry[]>;
  public queue$: Observable<QueueEntry[]>;

  private queueIdCounter = 1;

  constructor() {
     // Initialize with mock data for demonstration
    
    this.queueSubject = new BehaviorSubject<QueueEntry[]>([]);
    this.queue$ = this.queueSubject.asObservable();

    const initialQueue = this.generateMockQueue();

    this.queueSubject.next(initialQueue)
  }

    /**
   * Get current queue state
   */
  getCurrentQueue(): QueueEntry[] {
    return this.queueSubject.value;
  }

   /**
   * Add patient to queue
   * This is where the PRIORITY QUEUE ALGORITHM runs
   */
  addToQueue(patient: Patient, priority: PatientPriority, nurseNotes?: string): QueueEntry {
    const currentQueue = this.getCurrentQueue();
    
    // Create new queue entry
    const queueEntry: QueueEntry = {
      id: `Q${String(this.queueIdCounter++).padStart(3, '0')}`,
      patient: patient,
      priority: priority,
      priorityScore: this.calculatePriorityScore(priority, new Date()),
      queuePosition: 0, // Will be calculated after sorting
      arrivalTime: new Date(),
      estimatedWaitTime: 0, // Will be calculated after sorting
      status: QueueStatus.WAITING,
      notes: nurseNotes
    };

    // Add to queue
    currentQueue.push(queueEntry);

    // Re-sort and recalculate positions
    this.sortAndUpdateQueue(currentQueue);

    console.log(`✅ Patient ${patient.firstName} ${patient.lastName} added to queue (Priority: ${priority})`);
    
    return queueEntry;
  }

  /**
   * CORE ALGORITHM: Calculate priority score
   * Formula: (Priority Weight × 1000) + (Wait Time in minutes)
   */
  private calculatePriorityScore(priority: PatientPriority, arrivalTime: Date): number {
    // Priority weights
    const priorityWeights = {
      [PatientPriority.CRITICAL]: 3,
      [PatientPriority.REGULAR]: 2,
      [PatientPriority.DELAYED]: 1
    };

    // Calculate wait time in minutes
    const now = new Date();
    const waitTimeMinutes = Math.floor((now.getTime() - arrivalTime.getTime()) / 60000);

    // Calculate score
    const priorityWeight = priorityWeights[priority];
    const score = (priorityWeight * 1000) + waitTimeMinutes;

    return score;
  }

  /**
   * CORE ALGORITHM: Sort queue by priority score
   * This determines the order patients are seen
   */
  private sortAndUpdateQueue(queue: QueueEntry[]): void {
    // Filter only waiting patients
    const waitingPatients = queue.filter(entry => entry.status === QueueStatus.WAITING);
    const otherPatients = queue.filter(entry => entry.status !== QueueStatus.WAITING);

    // Recalculate scores (accounts for increasing wait time)
    waitingPatients.forEach(entry => {
      entry.priorityScore = this.calculatePriorityScore(entry.priority, entry.arrivalTime);
    });

    // Sort by priority score (highest first)
    waitingPatients.sort((a, b) => b.priorityScore - a.priorityScore);

    // Update queue positions and estimated wait times
    waitingPatients.forEach((entry, index) => {
      entry.queuePosition = index + 1;
      entry.estimatedWaitTime = (index + 1) * this.AVERAGE_SERVICE_TIME;
    });

    // Combine sorted waiting patients with others
    const updatedQueue = [...waitingPatients, ...otherPatients];

    // Emit updated queue
    this.queueSubject.next(updatedQueue);
  }

  /**
   * Call next patient (mark as in progress)
   */
  callNextPatient(doctorName: string): QueueEntry | null {
    const currentQueue = this.getCurrentQueue();
    const waitingPatients = currentQueue.filter(e => e.status === QueueStatus.WAITING);

    if (waitingPatients.length === 0) {
      console.log('⚠️ No patients in queue');
      return null;
    }

    // Get highest priority patient (already sorted)
    const nextPatient = waitingPatients[0];
    nextPatient.status = QueueStatus.IN_PROGRESS;
    nextPatient.assignedDoctor = doctorName;

    // Update queue
    this.sortAndUpdateQueue(currentQueue);

    console.log(`🔔 Calling patient: ${nextPatient.patient.firstName} ${nextPatient.patient.lastName}`);
    
    return nextPatient;
  }

  /**
   * Complete patient visit
   */
  completePatient(queueEntryId: string): void {
    const currentQueue = this.getCurrentQueue();
    const entry = currentQueue.find(e => e.id === queueEntryId);

    if (entry) {
      entry.status = QueueStatus.COMPLETED;
      this.sortAndUpdateQueue(currentQueue);
      console.log(`✅ Patient ${entry.patient.firstName} completed`);
    }
  }

  /**
   * Remove patient from queue (cancelled/no-show)
   */
  removeFromQueue(queueEntryId: string): void {
    const currentQueue = this.getCurrentQueue();
    const entry = currentQueue.find(e => e.id === queueEntryId);

    if (entry) {
      entry.status = QueueStatus.CANCELLED;
      this.sortAndUpdateQueue(currentQueue);
      console.log(`🚫 Patient ${entry.patient.firstName} removed from queue`);
    }
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): QueueStats {
    const currentQueue = this.getCurrentQueue();
    const waitingPatients = currentQueue.filter(e => e.status === QueueStatus.WAITING);
    const completedToday = currentQueue.filter(e => e.status === QueueStatus.COMPLETED);

    const criticalCount = waitingPatients.filter(e => e.priority === PatientPriority.CRITICAL).length;
    const regularCount = waitingPatients.filter(e => e.priority === PatientPriority.REGULAR).length;
    const delayedCount = waitingPatients.filter(e => e.priority === PatientPriority.DELAYED).length;

    const waitTimes = waitingPatients.map(e => {
      const now = new Date();
      return Math.floor((now.getTime() - e.arrivalTime.getTime()) / 60000);
    });

    const averageWaitTime = waitTimes.length > 0 
      ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length 
      : 0;

    const longestWaitTime = waitTimes.length > 0 ? Math.max(...waitTimes) : 0;

    return {
      totalPatients: waitingPatients.length,
      criticalCount,
      totalInQueue: waitingPatients.length,
      regularCount,
      delayedCount,
      averageWaitTime: Math.round(averageWaitTime),
      longestWaitTime,
      patientsServedToday: completedToday.length
    };
  }

  /**
   * Generate mock data for demonstration
   */
  private generateMockQueue(): QueueEntry[] {
    const mockPatients: Patient[] = [
      {
        id: 'P001',
        firstName: 'Adewale',
        lastName: 'Okafor',
        age: 45,
        gender: 'Male',
        phoneNumber: '08012345678',
        medicalCondition: MedicalConditions.CARDIAC_ARREST,
        symptoms: 'Severe chest pain, shortness of breath',
        registrationDate: new Date(Date.now() - 30 * 60000), // 30 min ago
        vitalSigns: {
          bloodPressure: '160/100',
          heartRate: 110,
          temperature: 37.2,
          oxygenSaturation: 88
        }
      },
      {
        id: 'P002',
        firstName: 'Chioma',
        lastName: 'Nwosu',
        age: 28,
        gender: 'Female',
        phoneNumber: '08087654321',
        medicalCondition: MedicalConditions.ROUTINE_CHECKUP,
        symptoms: 'Annual health checkup',
        registrationDate: new Date(Date.now() - 45 * 60000) // 45 min ago
      },
      {
        id: 'P003',
        firstName: 'Ibrahim',
        lastName: 'Mohammed',
        age: 62,
        gender: 'Male',
        phoneNumber: '08098765432',
        medicalCondition: MedicalConditions.FEVER,
        symptoms: 'High fever for 2 days, body aches',
        registrationDate: new Date(Date.now() - 20 * 60000), // 20 min ago
        vitalSigns: {
          bloodPressure: '130/85',
          heartRate: 95,
          temperature: 39.5,
          oxygenSaturation: 96
        }
      },
      {
        id: 'P004',
        firstName: 'Blessing',
        lastName: 'Eze',
        age: 35,
        gender: 'Female',
        phoneNumber: '08076543210',
        medicalCondition: MedicalConditions.SEVERE_TRAUMA,
        symptoms: 'Car accident - multiple injuries',
        registrationDate: new Date(Date.now() - 10 * 60000), // 10 min ago
        vitalSigns: {
          bloodPressure: '90/60',
          heartRate: 120,
          temperature: 36.8,
          oxygenSaturation: 90
        }
      }
    ];

    const queueEntries: QueueEntry[] = [];

    // Add Critical patients
    queueEntries.push({
      id: 'Q001',
      patient: mockPatients[0],
      priority: PatientPriority.CRITICAL,
      priorityScore: 0,
      queuePosition: 0,
      arrivalTime: mockPatients[0].registrationDate,
      estimatedWaitTime: 0,
      status: QueueStatus.WAITING
    });

    queueEntries.push({
      id: 'Q004',
      patient: mockPatients[3],
      priority: PatientPriority.CRITICAL,
      priorityScore: 0,
      queuePosition: 0,
      arrivalTime: mockPatients[3].registrationDate,
      estimatedWaitTime: 0,
      status: QueueStatus.WAITING
    });

    // Add Regular patient
    queueEntries.push({
      id: 'Q003',
      patient: mockPatients[2],
      priority: PatientPriority.REGULAR,
      priorityScore: 0,
      queuePosition: 0,
      arrivalTime: mockPatients[2].registrationDate,
      estimatedWaitTime: 0,
      status: QueueStatus.WAITING
    });

    // Add Delayed patient
    queueEntries.push({
      id: 'Q002',
      patient: mockPatients[1],
      priority: PatientPriority.DELAYED,
      priorityScore: 0,
      queuePosition: 0,
      arrivalTime: mockPatients[1].registrationDate,
      estimatedWaitTime: 0,
      status: QueueStatus.WAITING
    });

    this.queueIdCounter = 5; // Next ID will be Q005

    // Sort and calculate positions
    this.sortAndUpdateQueue(queueEntries);

    return queueEntries;
  }

}
