import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  Notification,
  NotificationType,
  DEFAULT_NOTIFICATION_DURATION,
} from '../models/notification.model';

@Injectable({
  providedIn: 'root',
})
export class Notifications {
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$: Observable<Notification[]> = this.notificationsSubject.asObservable();

  // Track auto-dismiss timers so we can cancel if removed manually
  private timers = new Map<string, any>();

  private push(notification: Notification): void {
    const list = [...this.notificationsSubject.value];
    list.unshift(notification); // newest on top
    this.notificationsSubject.next(list);

    const duration = notification.duration ?? DEFAULT_NOTIFICATION_DURATION;
    if (duration && duration > 0) {
      const t = setTimeout(() => this.removeNotification(notification.id), duration);
      this.timers.set(notification.id, t);
    }
  }

  private makeId(): string {
    return Math.random().toString(36).slice(2, 9);
  }

  // Public API
  success(title: string, message: string, duration?: number) {
    this.push({
      id: this.makeId(),
      type: NotificationType.SUCCESS,
      title,
      message,
      timestamp: new Date(),
      duration,
    });
  }

  error(title: string, message: string, duration?: number) {
    this.push({
      id: this.makeId(),
      type: NotificationType.ERROR,
      title,
      message,
      timestamp: new Date(),
      duration,
    });
  }

  warning(title: string, message: string, duration?: number) {
    this.push({
      id: this.makeId(),
      type: NotificationType.WARNING,
      title,
      message,
      timestamp: new Date(),
      duration,
    });
  }

  info(title: string, message: string, duration?: number) {
    this.push({
      id: this.makeId(),
      type: NotificationType.INFO,
      title,
      message,
      timestamp: new Date(),
      duration,
    });
  }

  removeNotification(id: string): void {
    const list = this.notificationsSubject.value.filter((n) => n.id !== id);
    this.notificationsSubject.next(list);
    const t = this.timers.get(id);
    if (t) {
      clearTimeout(t);
      this.timers.delete(id);
    }
  }

  clearAll(): void {
    this.notificationsSubject.next([]);
    this.timers.forEach((t) => clearTimeout(t));
    this.timers.clear();
  }
}
