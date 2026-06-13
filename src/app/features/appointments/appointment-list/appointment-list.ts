import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AppointmentService } from '../../../core/services/appointment-service';
import { Appointment, AppointmentStatus } from '../../../core/models/patient.model';
import { Notifications } from '../../../core/services/notifications';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-appointment-list',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './appointment-list.html',
  styleUrl: './appointment-list.css',
})
export class AppointmentList implements OnInit, OnDestroy {
  appointments: Appointment[] = [];
  filteredAppointments: Appointment[] = [];
  isLoading = true;

  AppointmentStatus = AppointmentStatus;

  filterStatus: string = 'all';
  filterDate: string = '';
  searchTerm: string = '';

  private destroy$ = new Subject<void>();

  constructor(
    private appointmentService: AppointmentService,
    private notifications: Notifications
  ) {}

  ngOnInit(): void {
    // Subscribe first so any emission updates the UI
    this.appointmentService.appointments$
      .pipe(takeUntil(this.destroy$))
      .subscribe((appointments) => {
        this.appointments = appointments;
        this.applyFilters();
        this.isLoading = false;
      });

    // Force fresh fetch from Appwrite
    this.appointmentService.loadAppointments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  applyFilters(): void {
    this.filteredAppointments = this.appointments.filter((apt) => {
      const matchesStatus =
        this.filterStatus === 'all' || apt.status === this.filterStatus;

      let matchesDate = true;
      if (this.filterDate) {
        const aptDate = new Date(apt.appointmentDate).toISOString().split('T')[0];
        matchesDate = aptDate === this.filterDate;
      }

      const matchesSearch =
        apt.patientName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        apt.doctorName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        apt.reason.toLowerCase().includes(this.searchTerm.toLowerCase());

      return matchesStatus && matchesDate && matchesSearch;
    });

    this.filteredAppointments.sort((a, b) => {
      return (
        new Date(a.appointmentDate).getTime() -
        new Date(b.appointmentDate).getTime()
      );
    });
  }

  confirmAppointment(appointmentId: string): void {
    if (confirm('Confirm this appointment?')) {
      this.appointmentService
        .updateAppointmentStatus(appointmentId, AppointmentStatus.CONFIRMED)
        .then(() => {
          this.notifications.success('Confirmed', 'Appointment confirmed successfully!');
        })
        .catch(() =>
          this.notifications.error('Error', 'Failed to confirm appointment.')
        );
    }
  }

  cancelAppointment(appointmentId: string): void {
    if (confirm('Are you sure you want to cancel this appointment?')) {
      this.appointmentService
        .cancelAppointment(appointmentId)
        .then(() => {
          this.notifications.warning('Cancelled', 'Appointment has been cancelled.');
        })
        .catch(() =>
          this.notifications.error('Error', 'Failed to cancel appointment.')
        );
    }
  }

  deleteAppointment(appointmentId: string): void {
    if (
      confirm(
        'Are you sure you want to delete this appointment? This action cannot be undone.'
      )
    ) {
      this.appointmentService
        .deleteAppointment(appointmentId)
        .then(() => {
          this.notifications.warning('Deleted', 'Appointment has been deleted.');
        })
        .catch(() =>
          this.notifications.error('Error', 'Failed to delete appointment.')
        );
    }
  }

  getStatusClass(status: AppointmentStatus): string {
    switch (status) {
      case AppointmentStatus.SCHEDULED: return 'status-scheduled';
      case AppointmentStatus.CONFIRMED: return 'status-confirmed';
      case AppointmentStatus.CANCELLED: return 'status-cancelled';
      case AppointmentStatus.COMPLETED: return 'status-completed';
      case AppointmentStatus.NO_SHOW:   return 'status-no-show';
      default: return '';
    }
  }

  getAppointmentTypeIcon(type: string): string {
    const icons: any = {
      CONSULTATION: '🩺',
      FOLLOW_UP: '🔄',
      SURGERY: '⚕️',
      LAB_TEST: '🧪',
      VACCINATION: '💉',
    };
    return icons[type] || '📋';
  }

  isUpcoming(appointment: Appointment): boolean {
    const aptDateTime = new Date(appointment.appointmentDate);
    aptDateTime.setHours(parseInt(appointment.appointmentTime.split(':')[0]));
    aptDateTime.setMinutes(parseInt(appointment.appointmentTime.split(':')[1]));
    return aptDateTime > new Date();
  }

  isPast(appointment: Appointment): boolean {
    return !this.isUpcoming(appointment);
  }

  getUpcomingCount(): number {
    return this.appointments.filter(
      (apt) => this.isUpcoming(apt) && apt.status !== AppointmentStatus.CANCELLED
    ).length;
  }

  getTodayCount(): number {
    const today = new Date().toISOString().split('T')[0];
    return this.appointments.filter((apt) => {
      const aptDate = new Date(apt.appointmentDate).toISOString().split('T')[0];
      return aptDate === today && apt.status !== AppointmentStatus.CANCELLED;
    }).length;
  }
}