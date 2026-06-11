export enum NotificationType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

export interface Notification {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  timestamp: Date;
  duration?: number; // milliseconds; if 0 or undefined, use default
}

export const DEFAULT_NOTIFICATION_DURATION = 5000;
