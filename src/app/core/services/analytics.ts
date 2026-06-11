import { Injectable } from '@angular/core';
import { Queue } from './queue';
import { AppointmentService } from './appointment-service';
import { QueueEntry, PatientPriority, Appointment, AppointmentStatus } from '../models/patient.model';

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
  ){}

  getPriorityDistribution(): ChartData {
    const queue = this.queueService.getCurrentQueue();
    
    const criticalCount = queue.filter(e => e.priority === PatientPriority.CRITICAL).length;
    const regularCount = queue.filter(e => e.priority === PatientPriority.REGULAR).length;
    const delayedCount = queue.filter(e => e.priority === PatientPriority.DELAYED).length;

    return {
      labels: ['Critical', 'Regular', 'Delayed'],
      datasets: [{
        data: [criticalCount, regularCount, delayedCount],
        backgroundColor: ['#dc3545', '#007bff', '#ffc107'],
        hoverBackgroundColor: ['#c82333', '#0056b3', '#e0a800']
      }]
    };
  }

  getDailyPatientsChart(): ChartData {
    //Mock data - last 7 days
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const patientsPerDay = [12, 19, 15, 22, 18, 8, 14];

      return {
      labels: days,
      datasets: [{
        label: 'Patients Treated',
        data: patientsPerDay,
        backgroundColor: 'rgba(0, 123, 255, 0.2)',
        borderColor: 'rgba(0, 123, 255, 1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }]
    };
  }

   getAppointmentStatusChart(): ChartData {
    const appointments = this.appointmentService.getAppointments();
    
    const scheduled = appointments.filter(a => a.status === AppointmentStatus.SCHEDULED).length;
    const confirmed = appointments.filter(a => a.status === AppointmentStatus.CONFIRMED).length;
    const cancelled = appointments.filter(a => a.status === AppointmentStatus.CANCELLED).length;
    const completed = appointments.filter(a => a.status === AppointmentStatus.COMPLETED).length;

    return {
      labels: ['Scheduled', 'Confirmed', 'Cancelled', 'Completed'],
      datasets: [{
        data: [scheduled, confirmed, cancelled, completed],
        backgroundColor: ['#ffc107', '#28a745', '#dc3545', '#17a2b8'],
        hoverBackgroundColor: ['#e0a800', '#218838', '#c82333', '#117a8b']
      }]
    };
  }

   getAverageWaitTimesChart(): ChartData {
    // Mock data for different time periods
    const timeSlots = ['9-11 AM', '11-1 PM', '1-3 PM', '3-5 PM'];
    const waitTimes = [25, 35, 45, 30]; // in minutes

    return {
      labels: timeSlots,
      datasets: [{
        label: 'Average Wait Time (minutes)',
        data: waitTimes,
        backgroundColor: [
          'rgba(40, 167, 69, 0.6)',
          'rgba(255, 193, 7, 0.6)',
          'rgba(220, 53, 69, 0.6)',
          'rgba(0, 123, 255, 0.6)'
        ],
        borderColor: [
          'rgba(40, 167, 69, 1)',
          'rgba(255, 193, 7, 1)',
          'rgba(220, 53, 69, 1)',
          'rgba(0, 123, 255, 1)'
        ],
        borderWidth: 2
      }]
    };
  }

  getWeeklyTrends(): ChartData {
    const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    
    return {
      labels: weeks,
      datasets: [
        {
          label: 'Critical Cases',
          data: [8, 12, 7, 15],
          borderColor: '#dc3545',
          backgroundColor: 'rgba(220, 53, 69, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Regular Cases',
          data: [45, 52, 48, 58],
          borderColor: '#007bff',
          backgroundColor: 'rgba(0, 123, 255, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Delayed Cases',
          data: [12, 8, 15, 10],
          borderColor: '#ffc107',
          backgroundColor: 'rgba(255, 193, 7, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    };
  }

  getAllAnalytics(): QueueAnalytics {
    return {
      priorityDistribution: this.getPriorityDistribution(),
      dailyPatients: this.getDailyPatientsChart(),
      appointmentStatus: this.getAppointmentStatusChart(),
      averageWaitTime: this.getAverageWaitTimesChart()
    };
  }
}
