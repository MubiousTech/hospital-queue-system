import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule, NgIf } from '@angular/common';
import { Subscription } from 'rxjs';
import { Auth } from '../../core/services/auth';
import { User } from '../../core/models/user.model';
import { Notifications } from '../../core/services/notifications';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, NgIf],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit, OnDestroy {
  hospitalName = 'Fountain Teaching Hospital';
  currentUser: User | null = null;
  private userSubscription?: Subscription;

  constructor(
    private auth: Auth,
    private router: Router,
    private notifications: Notifications,
  ) {}

  ngOnInit(): void {
    //Subscribe to current user changes
    this.userSubscription = this.auth.currentUser.subscribe((user) => {
      this.currentUser = user;
    });
  }

  ngOnDestroy(): void {
    //Cleanup subscription to prevent memory leaks
    this.userSubscription?.unsubscribe();
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  getUserName(): string {
    if (this.currentUser) {
      return this.currentUser.firstName || this.currentUser.email;
    }
    return 'Guest';
  }

  onLogout(): void {
    this.auth.logout();
    this.notifications.info('Logged Out', 'You have been logged out successfully.');
    this.router.navigate(['/login']);
  }
}
