import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { Notifications } from '../../../core/services/notifications';
import { Notification, NotificationType } from '../../../core/models/notification.model';

@Component({
  selector: 'app-notification-container',
  imports: [CommonModule],
  template: `
    <div class="notification-wrapper">
      <div *ngFor="let n of notifications" class="notification" [ngClass]="getClass(n.type)">
        <div class="notification-content">
          <span class="notification-icon">{{ getIcon(n.type) }}</span>
          <div class="notification-text">
            <strong *ngIf="n.title">{{ n.title }}</strong>
            <p>{{ n.message }}</p>
          </div>
        </div>
        <button class="notification-close" (click)="dismiss(n.id)">✕</button>
      </div>
    </div>
  `,
  styles: [
    `
      .notification-wrapper {
        position: fixed;
        top: 1.5rem;
        right: 1.5rem;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        max-width: 380px;
        width: 100%;
      }
      .notification {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        padding: 1rem 1.25rem;
        border-radius: 10px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
        animation: slideIn 0.3s ease;
        background: white;
        border-left: 5px solid transparent;
      }
      .notification-content {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
      }
      .notification-icon {
        font-size: 1.25rem;
      }
      .notification-text strong {
        display: block;
        margin-bottom: 0.2rem;
        font-size: 0.95rem;
      }
      .notification-text p {
        margin: 0;
        font-size: 0.875rem;
        color: #555;
      }
      .notification-close {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 0.875rem;
        color: #999;
        padding: 0;
        margin-left: 1rem;
        flex-shrink: 0;
      }
      .notification-close:hover {
        color: #333;
      }

      .notification-success {
        border-left-color: #28a745;
      }
      .notification-error {
        border-left-color: #dc3545;
      }
      .notification-warning {
        border-left-color: #ffc107;
      }
      .notification-info {
        border-left-color: #007bff;
      }

      @keyframes slideIn {
        from {
          transform: translateX(120%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `,
  ],
})
export class NotificationContainer implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  private sub?: Subscription;

  constructor(private notificationService: Notifications) {}

  ngOnInit(): void {
    this.sub = this.notificationService.notifications$.subscribe((notifications) => {
      this.notifications = notifications;
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  dismiss(id: string): void {
    this.notificationService.removeNotification(id);
  }

  getClass(type: NotificationType): string {
    return `notification-${type}`;
  }

  getIcon(type: NotificationType): string {
    switch (type) {
      case NotificationType.SUCCESS:
        return '✅';
      case NotificationType.ERROR:
        return '❌';
      case NotificationType.WARNING:
        return '⚠️';
      case NotificationType.INFO:
        return 'ℹ️';
      default:
        return '';
    }
  }

}
