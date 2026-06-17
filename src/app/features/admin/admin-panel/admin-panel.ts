import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Queue } from '../../../core/services/queue';
import { databases, DB_ID, COLLECTIONS } from '../../../core/services/appwrite.config';
import { Query } from 'appwrite';
import {
  QueueEntry,
  QueueStats,
  PatientPriority,
  QueueStatus,
} from '../../../core/models/patient.model';
import { Subject, takeUntil } from 'rxjs';

interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'Active' | 'Inactive';
  lastLogin: Date;
}

@Component({
  selector: 'app-admin-panel',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-panel.html',
  styleUrl: './admin-panel.css',
})
export class AdminPanel implements OnInit, OnDestroy {
  queueStats: QueueStats | null = null;
  allQueueEntries: QueueEntry[] = [];

  systemUsers: SystemUser[] = [];
  filteredUsers: SystemUser[] = [];
  searchTerm: string = '';
  selectedRole: string = 'all';
  isLoadingUsers = false;

  activeTab: 'overview' | 'users' | 'queue' | 'settings' = 'overview';

  private destroy$ = new Subject<void>();

  constructor(
    private queueService: Queue,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Load fresh queue data first
    this.queueService.loadQueue().then(() => {
      this.queueStats = this.queueService.getQueueStats();
    });

    // Then subscribe for future updates
    this.queueService.queue$.pipe(takeUntil(this.destroy$)).subscribe((queue) => {
      this.allQueueEntries = queue;
      this.queueStats = this.queueService.getQueueStats();
    });

    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─────────────────────────────────────────────
  // LOAD USERS FROM APPWRITE
  // ─────────────────────────────────────────────

  async loadUsers(): Promise<void> {
    this.isLoadingUsers = true;
    try {
      const result = await databases.listDocuments(DB_ID, COLLECTIONS.USERS, [Query.limit(100)]);

      this.systemUsers = result.documents.map((doc) => ({
        id: doc.$id,
        name: `${doc['firstName']} ${doc['lastName']}`,
        email: doc['email'],
        role: doc['role'].toUpperCase(),
        status: 'Active' as 'Active' | 'Inactive',
        lastLogin: new Date(doc['$updatedAt']),
      }));

      this.filteredUsers = [...this.systemUsers];
      console.log(`✅ Users loaded: ${this.systemUsers.length}`);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      this.isLoadingUsers = false;
    }
    this.cdr.detectChanges();
  }

  switchTab(tab: 'overview' | 'users' | 'queue' | 'settings'): void {
    this.activeTab = tab;
  }

  filterUsers(): void {
    this.filteredUsers = this.systemUsers.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesRole = this.selectedRole === 'all' || user.role === this.selectedRole;
      return matchesSearch && matchesRole;
    });
    this.cdr.detectChanges();
  }

  toggleUserStatus(userId: string): void {
    const user = this.systemUsers.find((u) => u.id === userId);
    if (user) {
      user.status = user.status === 'Active' ? 'Inactive' : 'Active';
      this.filterUsers();
      alert(`User ${user.name} is now ${user.status}`);
    }
  }

  async deleteUser(userId: string): Promise<void> {
    const user = this.systemUsers.find((u) => u.id === userId);
    if (user && confirm(`Are you sure you want to delete user: ${user.name}?`)) {
      try {
        await databases.deleteDocument(DB_ID, COLLECTIONS.USERS, userId);
        this.systemUsers = this.systemUsers.filter((u) => u.id !== userId);
        this.filterUsers();
        alert(`User ${user.name} has been deleted`);
      } catch (error) {
        console.error('Failed to delete user:', error);
        alert('❌ Failed to delete user. Please try again.');
      }
    }
  }

  addNewUser(): void {
    alert('Add New User feature coming soon!');
  }

  exportData(): void {
    alert('Export data functionality coming soon!');
  }

  getPriorityClass(priority: PatientPriority): string {
    switch (priority) {
      case PatientPriority.CRITICAL:
        return 'priority-critical';
      case PatientPriority.REGULAR:
        return 'priority-regular';
      case PatientPriority.DELAYED:
        return 'priority-delayed';
    }
  }

  getStatusClass(status: QueueStatus): string {
    switch (status) {
      case QueueStatus.WAITING:
        return 'status-waiting';
      case QueueStatus.IN_PROGRESS:
        return 'status-in_progress';
      case QueueStatus.COMPLETED:
        return 'status-completed';
      case QueueStatus.CANCELLED:
        return 'status-cancelled';
      default:
        return '';
    }
  }

  navigateToQueue(): void {
    this.router.navigate(['/queue']);
  }

  navigateToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  getDoctorCount(): number {
    return this.systemUsers.filter((u) => u.role === 'DOCTOR').length;
  }

  getNurseCount(): number {
    return this.systemUsers.filter((u) => u.role === 'NURSE').length;
  }

  getPatientCount(): number {
    return this.systemUsers.filter((u) => u.role === 'PATIENT').length;
  }
}
