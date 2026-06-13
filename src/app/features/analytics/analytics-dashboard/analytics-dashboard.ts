import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import { Analytics, ChartData } from '../../../core/services/analytics';
import { Queue } from '../../../core/services/queue';
import { AppointmentService } from '../../../core/services/appointment-service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-analytics-dashboard',
  imports: [CommonModule, RouterLink, BaseChartDirective],
  templateUrl: './analytics-dashboard.html',
  styleUrl: './analytics-dashboard.css',
})
export class AnalyticsDashboard implements OnInit, OnDestroy {
  isLoading = true;

  // Pie Chart - Priority Distribution
  public pieChartType: ChartType = 'pie';
  public pieChartData: ChartConfiguration<'pie'>['data'] = {
    labels: [],
    datasets: [],
  };
  public pieChartOptions: ChartConfiguration<'pie'>['options'] = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom' },
      title: { display: true, text: 'Queue Priority Distribution' },
    },
  };

  // Line Chart - Daily Patients
  public lineChartType: ChartType = 'line';
  public lineChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [],
  };
  public lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Daily Patients (Last 7 Days)' },
    },
    scales: { y: { beginAtZero: true } },
  };

  // Doughnut Chart - Appointment Status
  public doughnutChartType: ChartType = 'doughnut';
  public doughnutChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: [],
    datasets: [],
  };
  public doughnutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom' },
      title: { display: true, text: 'Appointment Status' },
    },
  };

  // Bar Chart - Average Wait Times
  public barChartType: ChartType = 'bar';
  public barChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [],
  };
  public barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Average Wait Times by Time Slot' },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Minutes' },
      },
    },
  };

  // Multi-line Chart - Weekly Trends
  public multiLineChartType: ChartType = 'line';
  public multiLineChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [],
  };
  public multiLineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Weekly Trends by Priority' },
    },
    scales: { y: { beginAtZero: true } },
  };

  private destroy$ = new Subject<void>();

  constructor(
    private analyticsService: Analytics,
    private queueService: Queue,
    private appointmentService: AppointmentService
  ) {}

  ngOnInit(): void {
    if (!(Chart as any)._registered) {
      Chart.register(...registerables);
      (Chart as any)._registered = true;
    }

    // Load fresh data first
    Promise.all([
      this.queueService.loadQueue(),
      this.appointmentService.loadAppointments(),
    ]).then(() => {
      this.loadCharts();
      this.isLoading = false;
    });

    // Reactively update charts when queue changes
    this.queueService.queue$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadCharts();
      });

    // Reactively update charts when appointments change
    this.appointmentService.appointments$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadCharts();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCharts(): void {
    this.pieChartData = { ...this.analyticsService.getPriorityDistribution() };
    this.lineChartData = { ...this.analyticsService.getDailyPatientsChart() };
    this.doughnutChartData = { ...this.analyticsService.getAppointmentStatusChart() };
    this.barChartData = { ...this.analyticsService.getAverageWaitTimesChart() };
    this.multiLineChartData = { ...this.analyticsService.getWeeklyTrends() };
  }

  refreshCharts(): void {
    this.isLoading = true;
    Promise.all([
      this.queueService.loadQueue(),
      this.appointmentService.loadAppointments(),
    ]).then(() => {
      this.loadCharts();
      this.isLoading = false;
    });
  }
}