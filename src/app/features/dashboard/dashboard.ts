import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../core/services/auth';
import { Queue } from '../../core/services/queue';
import { User, UserRole } from '../../core/models/user.model';
import { QueueStats } from '../../core/models/patient.model';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule, //Needed for pipes like data
    RouterLink,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit, OnDestroy {
  currentUser: User | null = null;
  userRole = UserRole;
  queueStats: QueueStats | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private authService: Auth,
    private queueService: Queue,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.authService.currentUser.pipe(takeUntil(this.destroy$)).subscribe((user) => {
      this.currentUser = user;
    });

    // Subscribe to queue so stats update reactively
    this.queueService.queue$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.queueStats = this.queueService.getQueueStats();
    });

    // Load fresh data from Appwrite on init
    this.queueService.loadQueue();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  loadQueueStats(): void {
    this.queueStats = this.queueService.getQueueStats();
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

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
