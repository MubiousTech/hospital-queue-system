import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register';
import { Dashboard } from './features/dashboard/dashboard';
import { AppointmentList } from './features/appointments/appointment-list/appointment-list';
import { HealthRecord } from './features/health-record/health-record';
import { QueueManagement } from './features/queue/queue-management/queue-management';
import { AddPatient } from './features/queue/add-patient/add-patient';
import { AdminPanel } from './features/admin/admin-panel/admin-panel';
import { authGuard } from './core/guards/auth-guard';
import { roleGuard } from './core/guards/role-guard';
import { UserRole } from './core/models/user.model';
import { AccessDenied } from './features/access-denied/access-denied';
import { BookAppointment } from './features/appointments/book-appointment/book-appointment';
import { AnalyticsDashboard } from './features/analytics/analytics-dashboard/analytics-dashboard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'register', component: Register },

  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [authGuard],
  },

  {
    path: 'queue',
    component: QueueManagement,
    canActivate: [authGuard, roleGuard],
    data: { roles: [UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN] },
  },

  // ← ADD THIS NEW ROUTE
  {
    path: 'queue/add-patient',
    component: AddPatient,
    canActivate: [authGuard, roleGuard],
    data: { roles: [UserRole.NURSE, UserRole.ADMIN] },
  },

  {
    path: 'admin',
    component: AdminPanel,
    canActivate: [authGuard, roleGuard],
    data: { roles: [UserRole.ADMIN] },
  },

  // Admin-only staff registration
  {
    path: 'admin/register-staff',
    component: Register,
    canActivate: [authGuard, roleGuard],
    data: { roles: [UserRole.ADMIN] },
  },

  {
    path: 'appointments',
    component: AppointmentList, // We'll create this next
    canActivate: [authGuard],
  },

  {
    path: 'appointments/book',
    component: BookAppointment,
    canActivate: [authGuard],
  },

  {
    path: 'health-record',
    component: HealthRecord,
    canActivate: [authGuard, roleGuard],
    data: { roles: [UserRole.RECORD_OFFICER, UserRole.ADMIN] },
  },

  {
    path: 'analytics',
    component: AnalyticsDashboard,
    canActivate: [authGuard],
  },

  { path: 'access-denied', component: AccessDenied },

  { path: '**', redirectTo: '/login' },
];
