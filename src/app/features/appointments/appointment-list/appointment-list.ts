import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AppointmentService } from '../../../core/services/appointment-service';
import { Appointment, AppointmentStatus } from '../../../core/models/patient.model';
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

  AppointmentStatus = AppointmentStatus;

  filterStatus: string = 'all';
  filterDate: string = '';
  searchTerm: string = '';

  private destroy$ = new Subject<void>();

  constructor(private appointmentService: AppointmentService) {}

  ngOnInit(): void {
    this.loadAppointments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAppointments(): void {
    // First subscribe to state changes
    this.appointmentService.appointments$
      .pipe(takeUntil(this.destroy$))
      .subscribe((appointments) => {
        this.appointments = appointments;
        this.applyFilters();
      });

    // Then force a fresh fetch from Appwrite
    this.appointmentService.loadAppointments();
  }

  applyFilters(): void {
    this.filteredAppointments = this.appointments.filter((apt) => {
      // Status filter
      const matchesStatus = this.filterStatus === 'all' || apt.status === this.filterStatus;

      // Date filter
      let matchesDate = true;
      if (this.filterDate) {
        const aptDate = new Date(apt.appointmentDate).toISOString().split('T')[0];
        matchesDate = aptDate === this.filterDate;
      }

      // Search filter
      const matchesSearch =
        apt.patientName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        apt.doctorName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        apt.reason.toLowerCase().includes(this.searchTerm.toLowerCase());

      return matchesStatus && matchesDate && matchesSearch;
    });

    // Sort by date (upcoming first)
    this.filteredAppointments.sort((a, b) => {
      return new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime();
    });
  }

  confirmAppointment(appointmentId: string): void {
    if (confirm('Confirm this appointment?')) {
      this.appointmentService
        .updateAppointmentStatus(appointmentId, AppointmentStatus.CONFIRMED)
        .then(() => {
          alert('Appointment confirmed successfully!');
          return this.appointmentService.loadAppointments();
        })
        .catch(() => alert('❌ Failed to confirm appointment. Please try again.'));
    }
  }

  cancelAppointment(appointmentId: string): void {
    if (confirm('Are you sure you want to cancel this appointment?')) {
      this.appointmentService
        .cancelAppointment(appointmentId)
        .then(() => {
          alert('Appointment cancelled successfully!');
          return this.appointmentService.loadAppointments();
        })
        .catch(() => alert('❌ Failed to cancel appointment. Please try again.'));
    }
  }

  deleteAppointment(appointmentId: string): void {
    if (
      confirm('Are you sure you want to delete this appointment? This action cannot be undone.')
    ) {
      this.appointmentService
        .deleteAppointment(appointmentId)
        .then(() => {
          alert('Appointment deleted successfully!');
          return this.appointmentService.loadAppointments();
        })
        .catch(() => alert('❌ Failed to delete appointment. Please try again.'));
    }
  }

  getStatusClass(status: AppointmentStatus): string {
    switch (status) {
      case AppointmentStatus.SCHEDULED:
        return 'status-scheduled';
      case AppointmentStatus.CONFIRMED:
        return 'status-confirmed';
      case AppointmentStatus.CANCELLED:
        return 'status-cancelled';
      case AppointmentStatus.COMPLETED:
        return 'status-completed';
      case AppointmentStatus.NO_SHOW:
        return 'status-no-show';
      default:
        return '';
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
      (apt) => this.isUpcoming(apt) && apt.status !== AppointmentStatus.CANCELLED,
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
