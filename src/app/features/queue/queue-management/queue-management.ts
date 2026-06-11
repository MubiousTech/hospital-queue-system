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

  private queueSubscription?: Subscription;
  private refreshSubscription?: Subscription;

  // Expose enums to template
  PatientPriority = PatientPriority;
  QueueStatus = QueueStatus;

  constructor(
    private queueService: Queue,
    private authService: Auth,
  ) {}

  ngOnInit(): void {
    // Get current user
    this.currentUser = this.authService.currentUserValue;

    // Subscribe to queue updates
    this.queueSubscription = this.queueService.queue$.subscribe((queue) => {
      this.queueEntries = queue;
      this.queueStats = this.queueService.getQueueStats();
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

  /**
   * Call next patient in queue
   */
  callNextPatient(): void {
    const doctorName = this.currentUser?.firstName || 'Dr. Unknown';

    this.queueService
      .callNextPatient(doctorName)
      .then((nextPatient) => {
        if (nextPatient) {
          alert(
            `🔔 Now calling: ${nextPatient.patient.firstName} ${nextPatient.patient.lastName}\nPlease proceed to consultation room.`,
          );
        } else {
          alert('⚠️ No patients in queue');
        }
      })
      .catch(() => alert('❌ Failed to call next patient. Please try again.'));
  }

  /**
   * Mark patient as completed
   */
  completePatient(queueEntryId: string, patientName: string): void {
    if (confirm(`Mark ${patientName} as completed?`)) {
      this.queueService
        .completePatient(queueEntryId)
        .then(() => {
          alert(`✅ ${patientName} has been marked as completed.`);
        })
        .catch(() => alert('❌ Failed to complete patient. Please try again.'));
    }
  }

  /**
   * Remove patient from queue
   */
  removePatient(queueEntryId: string, patientName: string): void {
    if (confirm(`Remove ${patientName} from queue? (No-show/Cancelled)`)) {
      this.queueService
        .removeFromQueue(queueEntryId)
        .then(() => {
          alert(`🚫 ${patientName} has been removed from queue.`);
        })
        .catch(() => alert('❌ Failed to remove patient. Please try again.'));
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
    return Math.floor((now.getTime() - arrivalTime.getTime()) / 60000);
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
