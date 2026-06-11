import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, throwError, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { User, LoginRequest, LoginResponse, UserRole } from '../models/user.model';
import { account, databases, DB_ID, COLLECTIONS } from './appwrite.config';
import { ID, Query } from 'appwrite';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;

  constructor() {
    const storedUser = localStorage.getItem('currentUser');
    const user = storedUser ? JSON.parse(storedUser) : null;
    this.currentUserSubject = new BehaviorSubject<User | null>(user);
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Login — authenticates with Appwrite, then fetches role from users collection
   */
  login(loginRequest: LoginRequest): Observable<LoginResponse> {
  // Step 1: Delete any existing session first
  return from(account.deleteSession('current')).pipe(
    catchError(() => of(null)), // Ignore error if no session exists
    switchMap(() => {
      // Step 2: Create new Appwrite email session
      return from(
        account.createEmailPasswordSession(loginRequest.email, loginRequest.password)
      );
    }),
    switchMap((session) => {
      // Step 3: Fetch user role from users collection
      return from(
        databases.listDocuments(DB_ID, COLLECTIONS.USERS, [
          Query.equal('email', loginRequest.email),
        ])
      ).pipe(
        map((result) => {
          if (result.documents.length === 0) {
            throw new Error('User profile not found. Contact admin.');
          }

          const doc = result.documents[0];

          if (doc['role'] !== loginRequest.role) {
            throw new Error('Selected role does not match your account.');
          }

          const user: User = {
            id: doc.$id,
            email: doc['email'],
            firstName: doc['firstName'],
            lastName: doc['lastName'],
            role: doc['role'] as UserRole,
          };

          localStorage.setItem('currentUser', JSON.stringify(user));
          this.currentUserSubject.next(user);

          const response: LoginResponse = {
            success: true,
            user: user,
            message: 'Login successful',
          };

          return response;
        })
      );
    }),
    catchError((error) => {
      console.error('Login error:', error);
      const message =
        error?.message?.includes('Invalid credentials') ||
        error?.message?.includes('invalid_credentials')
          ? 'Invalid email or password.'
          : error?.message || 'Login failed. Please try again.';
      return throwError(() => new Error(message));
    })
  );
}

  /**
   * Logout — deletes Appwrite session and clears local state
   */
  logout(): void {
    from(account.deleteSession('current')).subscribe({
      error: (err) => console.warn('Session delete warning:', err),
    });
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    this.currentUserSubject.next(null);
  }

  isLoggedIn(): boolean {
    return this.currentUserValue !== null;
  }

  hasRole(role: UserRole): boolean {
    return this.currentUserValue?.role === role;
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }
}
