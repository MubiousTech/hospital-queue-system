import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription, interval } from 'rxjs';
import { Queue } from '../../../core/services/queue';
import { Auth } from '../../../core/services/auth';
import {
  QueueEntry,
  PatientPriority,
  QueueStatus,
  QueueStats,
} from '../../../core/models/patient.model';
import { Notifications } from '../../../core/services/notifications';
import { PatientServiceTs } from '../../../core/services/patient.service.ts';
import { MedicalRecord } from '../../../core/models/patient.model';

@Component({
  selector: 'app-queue-management',
  imports: [CommonModule, RouterLink],
  templateUrl: './queue-management.html',
  styleUrl: './queue-management.css',
})
export class QueueManagement implements OnInit, OnDestroy {
  queueEntries: QueueEntry[] = [];
  queueStats: QueueStats | null = null;
  currentUser: any = null;
  medicalRecords: Map<string, MedicalRecord> = new Map();

  private queueSubscription?: Subscription;
  private refreshSubscription?: Subscription;

  // Expose enums to template
  PatientPriority = PatientPriority;
  QueueStatus = QueueStatus;

  constructor(
    private queueService: Queue,
    private authService: Auth,
    private notifications: Notifications,
    private patientService: PatientServiceTs,
  ) {}

  ngOnInit(): void {
    // Get current user
    this.currentUser = this.authService.currentUserValue;

    // Subscribe to queue updates
    this.queueSubscription = this.queueService.queue$.subscribe((queue) => {
      this.queueEntries = queue;
      this.queueStats = this.queueService.getQueueStats();
      this.loadMedicalRecords(queue);
      console.log('🔄 Queue updated:', this.queueEntries.length, 'entries');
    });

    // Auto-refresh every 30 seconds (simulates real-time updates)
    this.refreshSubscription = interval(30000).subscribe(() => {
      this.refreshQueue();
    });

    // Initial load
    this.refreshQueue();
  }

  ngOnDestroy(): void {
    this.queueSubscription?.unsubscribe();
    this.refreshSubscription?.unsubscribe();
  }

  private async loadMedicalRecords(queue: QueueEntry[]): Promise<void> {
    for (const entry of queue) {
      if (entry.medicalRecordId && !this.medicalRecords.has(entry.medicalRecordId)) {
        try {
          const record = await this.patientService.getPatientMedicalRecord(entry.medicalRecordId);
          this.medicalRecords.set(entry.medicalRecordId, record);
        } catch (error) {
          console.error('Failed to load medical record:', error);
        }
      }
    }
  }

  getMedicalRecord(entry: QueueEntry): MedicalRecord | undefined {
    return entry.medicalRecordId ? this.medicalRecords.get(entry.medicalRecordId) : undefined;
  }

  /**
   * Refresh queue (recalculates priority scores based on updated wait times)
   */
  refreshQueue(): void {
    // Force queue recalculation
    const currentQueue = this.queueService.getCurrentQueue();
    this.queueEntries = currentQueue;
    this.queueStats = this.queueService.getQueueStats();
  }

  /**
   * Get patients by priority level
   */
  getPatientsByPriority(priority: PatientPriority): QueueEntry[] {
    return this.queueEntries.filter(
      (entry) => entry.priority === priority && entry.status === QueueStatus.WAITING,
    );
  }

  getInProgressPatients(): QueueEntry[] {
    return this.queueEntries.filter((entry) => entry.status === QueueStatus.IN_PROGRESS);
  }

  isDoctor(): boolean {
  return this.currentUser?.role === 'doctor';
}

  /**
   * Call next patient in queue
   */
  callNextPatient(): void {
    const doctorName = this.currentUser?.firstName || 'Dr. Unknown';
    this.queueService
      .callNextPatient(doctorName)
      .then((nextPatient) => {
        if (nextPatient) {
          this.notifications.success(
            'Patient Called',
            `Now calling: ${nextPatient.patient.firstName} ${nextPatient.patient.lastName}`,
          );
        } else {
          this.notifications.warning('Queue Empty', 'No patients currently waiting.');
        }
      })
      .catch(() => this.notifications.error('Error', 'Failed to call next patient.'));
  }

  /**
   * Mark patient as completed
   */
  completePatient(queueEntryId: string, patientName: string): void {
    if (confirm(`Mark ${patientName} as completed?`)) {
      this.queueService
        .completePatient(queueEntryId)
        .then(() => {
          this.notifications.success('Completed', `${patientName} has been marked as completed.`);
        })
        .catch(() => this.notifications.error('Error', 'Failed to complete patient.'));
    }
  }
  /**
   * Remove patient from queue
   */
  removePatient(queueEntryId: string, patientName: string): void {
    if (confirm(`Remove ${patientName} from queue?`)) {
      this.queueService
        .removeFromQueue(queueEntryId)
        .then(() => {
          this.notifications.warning('Removed', `${patientName} has been removed from queue.`);
        })
        .catch(() => this.notifications.error('Error', 'Failed to remove patient.'));
    }
  }
  /**
   * Get priority badge color class
   */
  getPriorityClass(priority: PatientPriority): string {
    switch (priority) {
      case PatientPriority.CRITICAL:
        return 'priority-critical';
      case PatientPriority.REGULAR:
        return 'priority-regular';
      case PatientPriority.DELAYED:
        return 'priority-delayed';
      default:
        return '';
    }
  }

  /**
   * Get priority icon
   */
  getPriorityIcon(priority: PatientPriority): string {
    switch (priority) {
      case PatientPriority.CRITICAL:
        return '🔴';
      case PatientPriority.REGULAR:
        return '🔵';
      case PatientPriority.DELAYED:
        return '🟡';
      default:
        return '⚪';
    }
  }

  /**
   * Calculate actual current wait time
   */
  getCurrentWaitTime(arrivalTime: Date): number {
    const now = new Date();
    const minutes = Math.floor((now.getTime() - new Date(arrivalTime).getTime()) / 60000);
    // Cap display at 999 minutes to avoid huge numbers
    return Math.min(minutes, 999);
  }

  /**
   * Format time display (e.g., "25 min", "1 hr 30 min")
   */
  formatWaitTime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
  }
}
