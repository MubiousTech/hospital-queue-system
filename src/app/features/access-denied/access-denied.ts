import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-access-denied',
  imports: [CommonModule],
  template: `
    <div class="access-denied-container">
      <div class="access-denied-card">
        <span class="icon">🚫</span>
        <h1>Access Denied</h1>
        <p>You do not have permission to view this page.</p>
        <button class="btn-back" (click)="goBack()">Go Back</button>
        <button class="btn-dashboard" (click)="goDashboard()">Go to Dashboard</button>
      </div>
    </div>
  `,
  styles: [`
    .access-denied-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #f8f9fa;
    }
    .access-denied-card {
      text-align: center;
      background: white;
      padding: 3rem;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
    .icon { font-size: 4rem; }
    h1 { color: #dc3545; margin: 1rem 0 0.5rem; }
    p { color: #6c757d; margin-bottom: 2rem; }
    button {
      margin: 0.5rem;
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1rem;
    }
    .btn-back { background: #6c757d; color: white; }
    .btn-dashboard { background: #007bff; color: white; }
  `]
})
export class AccessDenied {
  constructor(private router: Router) {}

  goBack(): void {
    window.history.back();
  }

  goDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}