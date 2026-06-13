import { Injectable } from '@angular/core';
import { Queue } from './queue';
import { AppointmentService } from './appointment-service';
import {
  PatientPriority,
  AppointmentStatus,
  QueueStatus,
} from '../models/patient.model';

export interface ChartData {
  labels: string[];
  datasets: any[];
}

export interface QueueAnalytics {
  priorityDistribution: ChartData;
  dailyPatients: ChartData;
  appointmentStatus: ChartData;
  averageWaitTime: ChartData;
}

@Injectable({
  providedIn: 'root',
})
export class Analytics {
  constructor(
    private queueService: Queue,
    private appointmentService: AppointmentService
  ) {}

  // ─────────────────────────────────────────────
  // PRIORITY DISTRIBUTION — real queue data
  // ─────────────────────────────────────────────

  getPriorityDistribution(): ChartData {
    const queue = this.queueService.getCurrentQueue();

    // Only count active patients
    const active = queue.filter(
      (e) =>
        e.status === QueueStatus.WAITING ||
        e.status === QueueStatus.IN_PROGRESS
    );

    const criticalCount = active.filter(
      (e) => e.priority === PatientPriority.CRITICAL
    ).length;
    const regularCount = active.filter(
      (e) => e.priority === PatientPriority.REGULAR
    ).length;
    const delayedCount = active.filter(
      (e) => e.priority === PatientPriority.DELAYED
    ).length;

    return {
      labels: ['Critical', 'Regular', 'Delayed'],
      datasets: [
        {
          data: [criticalCount, regularCount, delayedCount],
          backgroundColor: ['#dc3545', '#007bff', '#ffc107'],
          hoverBackgroundColor: ['#c82333', '#0056b3', '#e0a800'],
        },
      ],
    };
  }

  // ─────────────────────────────────────────────
  // DAILY PATIENTS — real queue data (last 7 days)
  // ─────────────────────────────────────────────

  getDailyPatientsChart(): ChartData {
    const queue = this.queueService.getCurrentQueue();
    const days: string[] = [];
    const counts: number[] = [];

    // Build last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' });
      days.push(dayLabel);

      // Count patients who arrived on this day
      const count = queue.filter((e) => {
        const arrival = new Date(e.arrivalTime).toISOString().split('T')[0];
        return arrival === dateStr;
      }).length;

      counts.push(count);
    }

    return {
      labels: days,
      datasets: [
        {
          label: 'Patients Treated',
          data: counts,
          backgroundColor: 'rgba(0, 123, 255, 0.2)',
          borderColor: 'rgba(0, 123, 255, 1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
        },
      ],
    };
  }

  // ─────────────────────────────────────────────
  // APPOINTMENT STATUS — real appointment data
  // ─────────────────────────────────────────────

  getAppointmentStatusChart(): ChartData {
    const appointments = this.appointmentService.getAppointments();

    const scheduled = appointments.filter(
      (a) => a.status === AppointmentStatus.SCHEDULED
    ).length;
    const confirmed = appointments.filter(
      (a) => a.status === AppointmentStatus.CONFIRMED
    ).length;
    const cancelled = appointments.filter(
      (a) => a.status === AppointmentStatus.CANCELLED
    ).length;
    const completed = appointments.filter(
      (a) => a.status === AppointmentStatus.COMPLETED
    ).length;

    return {
      labels: ['Scheduled', 'Confirmed', 'Cancelled', 'Completed'],
      datasets: [
        {
          data: [scheduled, confirmed, cancelled, completed],
          backgroundColor: ['#ffc107', '#28a745', '#dc3545', '#17a2b8'],
          hoverBackgroundColor: ['#e0a800', '#218838', '#c82333', '#117a8b'],
        },
      ],
    };
  }

  // ─────────────────────────────────────────────
  // AVERAGE WAIT TIMES — real queue data
  // ─────────────────────────────────────────────

  getAverageWaitTimesChart(): ChartData {
    const queue = this.queueService.getCurrentQueue();
    const timeSlots = ['9-11 AM', '11-1 PM', '1-3 PM', '3-5 PM'];
    const slotRanges = [
      { start: 9, end: 11 },
      { start: 11, end: 13 },
      { start: 13, end: 15 },
      { start: 15, end: 17 },
    ];

    const waitTimes = slotRanges.map((slot) => {
      const slotEntries = queue.filter((e) => {
        const hour = new Date(e.arrivalTime).getHours();
        return hour >= slot.start && hour < slot.end;
      });

      if (slotEntries.length === 0) return 0;

      const totalWait = slotEntries.reduce(
        (sum, e) => sum + e.estimatedWaitTime,
        0
      );
      return Math.round(totalWait / slotEntries.length);
    });

    return {
      labels: timeSlots,
      datasets: [
        {
          label: 'Average Wait Time (minutes)',
          data: waitTimes,
          backgroundColor: [
            'rgba(40, 167, 69, 0.6)',
            'rgba(255, 193, 7, 0.6)',
            'rgba(220, 53, 69, 0.6)',
            'rgba(0, 123, 255, 0.6)',
          ],
          borderColor: [
            'rgba(40, 167, 69, 1)',
            'rgba(255, 193, 7, 1)',
            'rgba(220, 53, 69, 1)',
            'rgba(0, 123, 255, 1)',
          ],
          borderWidth: 2,
        },
      ],
    };
  }

  // ─────────────────────────────────────────────
  // WEEKLY TRENDS — real queue data
  // ─────────────────────────────────────────────

  getWeeklyTrends(): ChartData {
    const queue = this.queueService.getCurrentQueue();
    const weeks: string[] = [];
    const criticalData: number[] = [];
    const regularData: number[] = [];
    const delayedData: number[] = [];

    // Build last 4 weeks
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - i * 7 - 6);
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - i * 7);

      weeks.push(`Week ${4 - i}`);

      const weekEntries = queue.filter((e) => {
        const arrival = new Date(e.arrivalTime);
        return arrival >= weekStart && arrival <= weekEnd;
      });

      criticalData.push(
        weekEntries.filter((e) => e.priority === PatientPriority.CRITICAL).length
      );
      regularData.push(
        weekEntries.filter((e) => e.priority === PatientPriority.REGULAR).length
      );
      delayedData.push(
        weekEntries.filter((e) => e.priority === PatientPriority.DELAYED).length
      );
    }

    return {
      labels: weeks,
      datasets: [
        {
          label: 'Critical Cases',
          data: criticalData,
          borderColor: '#dc3545',
          backgroundColor: 'rgba(220, 53, 69, 0.1)',
          tension: 0.4,
          fill: true,
        },
        {
          label: 'Regular Cases',
          data: regularData,
          borderColor: '#007bff',
          backgroundColor: 'rgba(0, 123, 255, 0.1)',
          tension: 0.4,
          fill: true,
        },
        {
          label: 'Delayed Cases',
          data: delayedData,
          borderColor: '#ffc107',
          backgroundColor: 'rgba(255, 193, 7, 0.1)',
          tension: 0.4,
          fill: true,
        },
      ],
    };
  }

  getAllAnalytics(): QueueAnalytics {
    return {
      priorityDistribution: this.getPriorityDistribution(),
      dailyPatients: this.getDailyPatientsChart(),
      appointmentStatus: this.getAppointmentStatusChart(),
      averageWaitTime: this.getAverageWaitTimesChart(),
    };
  }
}