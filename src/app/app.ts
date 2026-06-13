import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './layout/header/header';
import { Footer } from './layout/footer/footer';
import { Sidebar } from './layout/sidebar/sidebar';
import { NotificationContainer } from './shared/components/notification-container/notification-container';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    Header,
    Sidebar,
    Footer,
    NotificationContainer
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('hospital-queue-system');
}
