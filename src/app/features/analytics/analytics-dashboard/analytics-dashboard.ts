import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import { Analytics, ChartData } from '../../../core/services/analytics';

@Component({
  selector: 'app-analytics-dashboard',
  imports: [CommonModule, RouterLink, BaseChartDirective],
  templateUrl: './analytics-dashboard.html',
  styleUrl: './analytics-dashboard.css',
})
export class AnalyticsDashboard implements OnInit {
  // Pie Chart - Priority Distribution
  public pieChartType: ChartType = 'pie';
  public pieChartData: ChartConfiguration<'pie'>['data'] = {
    labels: [],
    datasets: [],
  };
  public pieChartOptions: ChartConfiguration<'pie'>['options'] = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
      title: {
        display: true,
        text: 'Queue Priority Distribution',
      },
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
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Daily Patients (Last 7 Days)',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
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
      legend: {
        position: 'bottom',
      },
      title: {
        display: true,
        text: 'Appointment Status',
      },
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
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Average Wait Times by Time Slot',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Minutes',
        },
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
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Weekly Trends by Priority',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  constructor(private analyticsService: Analytics) {}

  ngOnInit(): void {
    // Ensure Chart.js components are registered once
    if (!(Chart as any)._registered) {
      Chart.register(...registerables);
      (Chart as any)._registered = true;
    }

    this.loadCharts();
  }

  loadCharts(): void {
    // Load Priority Distribution (Pie)
    const priorityData = this.analyticsService.getPriorityDistribution();
    this.pieChartData = {
      labels: priorityData.labels,
      datasets: priorityData.datasets,
    };

    console.log('Analytics: pieChartData', this.pieChartData);

    // Load Daily Patients (Line)
    const dailyData = this.analyticsService.getDailyPatientsChart();
    this.lineChartData = {
      labels: dailyData.labels,
      datasets: dailyData.datasets,
    };

    // Load Appointment Status (Doughnut)
    const appointmentData = this.analyticsService.getAppointmentStatusChart();
    this.doughnutChartData = {
      labels: appointmentData.labels,
      datasets: appointmentData.datasets,
    };

    // Load Wait Times (Bar)
    const waitTimeData = this.analyticsService.getAverageWaitTimesChart();
    this.barChartData = {
      labels: waitTimeData.labels,
      datasets: waitTimeData.datasets,
    };

    // Load Weekly Trends (Multi-line)
    const weeklyData = this.analyticsService.getWeeklyTrends();
    this.multiLineChartData = {
      labels: weeklyData.labels,
      datasets: weeklyData.datasets,
    };

    console.log('Analytics: multiLineChartData', this.multiLineChartData);
  }

  refreshCharts(): void {
    this.loadCharts();
  }
}
