import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Queue } from '../../../core/services/queue';
import {
  QueueEntry,
  QueueStats,
  PatientPriority,
  QueueStatus,
} from '../../../core/models/patient.model';
import { queue } from 'rxjs';

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
export class AdminPanel implements OnInit {
  queueStats: QueueStats | null = null;
  allQueueEntries: QueueEntry[] = [];

  //System usres (mock data)
  systemUsers: SystemUser[] = [
    {
      id: '1',
      name: 'Admin User',
      email: 'admin@hospital.com',
      role: 'ADMIN',
      status: 'Active',
      lastLogin: new Date('2024-05-12T08:30:00'),
    },
    {
      id: '2',
      name: 'Dr. Sarah Johnson',
      email: 'doctor@hospital.com',
      role: 'DOCTOR',
      status: 'Active',
      lastLogin: new Date('2024-05-12T09:15:00'),
    },
    {
      id: '3',
      name: 'Nurse Mary Williams',
      email: 'nurse@hospital.com',
      role: 'NURSE',
      status: 'Active',
      lastLogin: new Date('2024-05-12T07:45:00'),
    },
    {
      id: '4',
      name: 'John Patient',
      email: 'patient@hospital.com',
      role: 'PATIENT',
      status: 'Active',
      lastLogin: new Date('2024-05-11T16:20:00'),
    },
  ];

  filteredUsers: SystemUser[] = [];
  searchTerm: string = '';
  selectedRole: string = 'all';

  activeTab: 'overview' | 'users' | 'queue' | 'settings' = 'overview';

  constructor(
    private queueService: Queue,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.filteredUsers = [...this.systemUsers];
  }

  loadData(): void {
    this.queueStats = this.queueService.getQueueStats();
    this.queueService.queue$.subscribe((queue) => {
      this.allQueueEntries = queue;
    });
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
  }

  toggleUserStatus(userId: string): void {
    const user = this.systemUsers.find((u) => u.id === userId);
    if (user) {
      user.status = user.status === 'Active' ? 'Inactive' : 'Active';
      this.filterUsers();
      alert(`User ${user.name} is now ${user.status}`);
    }
  }

  deleteUser(userId: string): void {
    const user = this.systemUsers.find((u) => u.id === userId);
    if (user && confirm(`Are you sure you want to delete user: ${user.name}?`)) {
      this.systemUsers = this.systemUsers.filter((u) => u.id !== userId);
      this.filterUsers();
      alert(`User ${user.name} has ben deleted`);
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
        return 'Status-completed';
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
  
  // ✅ Add these new methods
  getDoctorCount(): number {
    return this.systemUsers.filter(user => user.role === 'DOCTOR').length;
  }

  getNurseCount(): number {
    return this.systemUsers.filter(user => user.role === 'NURSE').length;
  }

  getPatientCount(): number {
    return this.systemUsers.filter(user => user.role === 'PATIENT').length;
  }
}
