import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../core/services/auth';
import { Queue } from '../../core/services/queue';
import { PatientServiceTs } from '../../core/services/patient.service.ts';
import { User, UserRole } from '../../core/models/user.model';
import { QueueStats } from '../../core/models/patient.model';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit, OnDestroy {
  currentUser: User | null = null;
  userRole = UserRole;
  queueStats: QueueStats | null = null;

  // Record Officer stats
  totalPatients = 0;
  newToday = 0;
  totalMedicalRecords = 0;
  isLoadingRecordStats = false;

  private destroy$ = new Subject<void>();

  constructor(
    private authService: Auth,
    private queueService: Queue,
    private patientService: PatientServiceTs,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.authService.currentUser.pipe(takeUntil(this.destroy$)).subscribe((user) => {
      this.currentUser = user;

      // Load role-specific data once we know who's logged in
      if (user?.role === UserRole.RECORD_OFFICER || user?.role === UserRole.ADMIN) {
        this.loadRecordOfficerStats();
      }
    });

    this.queueService.queue$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.queueStats = this.queueService.getQueueStats();
      this.cdr.detectChanges();
    });

    this.queueService.loadQueue();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadRecordOfficerStats(): Promise<void> {
    this.isLoadingRecordStats = true;
    try {
      const patients = await this.patientService.getAllPatients();
      this.totalPatients = patients.length;

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      this.newToday = patients.filter((p) => new Date(p.registrationDate) >= startOfToday).length;

      const histories = await Promise.all(
        patients.map((p) => this.patientService.getPatientHistory(p.id).catch(() => [])),
      );
      this.totalMedicalRecords = histories.reduce((sum, h) => sum + h.length, 0);
    } catch (error) {
      console.error('Failed to load record officer stats:', error);
    } finally {
      this.isLoadingRecordStats = false;
      this.cdr.detectChanges();
    }
  }

  navigateToQueue(): void {
    this.router.navigate(['/queue']);
  }

  navigateToAddPatient(): void {
    this.router.navigate(['/queue/add-patient']);
  }

  navigateToAdmin(): void {
    this.router.navigate(['/admin']);
  }

  navigateToBookAppointment(): void {
    this.router.navigate(['/appointments/book']);
  }

  navigateToHealthRecord(): void {
    this.router.navigate(['/health-record']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}