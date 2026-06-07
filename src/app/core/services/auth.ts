import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { delay, map } from 'rxjs';
import { User, LoginRequest, LoginResponse, UserRole } from '../models/user.model'; 

@Injectable({
  providedIn: 'root',
})
export class Auth {
  // BehaviorSubject stores current user state
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;


  // Mock users database (simulates backend)
  private mockUsers: User[] = [
    {
      id: 1,
      email: 'admin@hospital.com',
      password: 'Admin123',
      role: UserRole.ADMIN,
      firstName: 'Admin',
      lastName: 'User'
    },
    {
      id: 2,
      email: 'doctor@hospital.com',
      password: 'Doctor123',
      role: UserRole.DOCTOR,
      firstName: 'Dr. Adewale',
      lastName: 'Okonkwo'
    },
    {
      id: 3,
      email: 'nurse@hospital.com',
      password: 'Nurse123',
      role: UserRole.NURSE,
      firstName: 'Nurse',
      lastName: 'Chioma'
    },
    {
      id: 4,
      email: 'patient@hospital.com',
      password: 'Patient123',
      role: UserRole.PATIENT,
      firstName: 'John',
      lastName: 'Doe'
    }
  ];

   constructor() {
    // Load user from localStorage (persists across browser refreshes)
    const storedUser = localStorage.getItem('currentUser');
    const user = storedUser ? JSON.parse(storedUser) : null;
    
    this.currentUserSubject = new BehaviorSubject<User | null>(user);
    this.currentUser = this.currentUserSubject.asObservable();
  }

  // Getter for current user value
  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Login method - simulates backend API call
   * In production, this will call real API: http.post('/api/auth/login', credentials)
   */
  login(loginRequest: LoginRequest): Observable<LoginResponse> {
    console.log('🔐 Login attempt:', loginRequest);

    // Simulate network delay (500ms)
    return of(null).pipe(
      delay(500),
      map(() => {
        // Find user in mock database
        const user = this.mockUsers.find(
          u => u.email === loginRequest.email && 
               u.password === loginRequest.password &&
               u.role === loginRequest.role
        );

        // If user not found or credentials wrong
        if (!user) {
          throw new Error('Invalid email, password, or role');
        }

        // Generate mock JWT token
        const token = this.generateMockToken(user);

        // Remove password from user object (security)
        const { password, ...userWithoutPassword } = user;

        // Store user in localStorage
        localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
        localStorage.setItem('token', token);

        // Update BehaviorSubject (notifies all subscribers)
        this.currentUserSubject.next(userWithoutPassword as User);

        // Return successful response
        const response: LoginResponse = {
          success: true,
          token: token,
          user: userWithoutPassword as User,
          message: 'Login successful'
        };

        console.log('✅ Login successful:', response);
        return response;
      })
    );
  }

  /**
   * Logout method - clears user session
   */
  logout(): void {
    console.log('🚪 Logging out user');
    
    // Clear localStorage
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    
    // Clear BehaviorSubject
    this.currentUserSubject.next(null);
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn(): boolean {
    return this.currentUserValue !== null;
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: UserRole): boolean {
    return this.currentUserValue?.role === role;
  }

  /**
   * Get stored JWT token
   */
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  /**
   * Generate mock JWT token (simulates backend token generation)
   * In production, backend generates real JWT tokens
   */
  private generateMockToken(user: User): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      userId: user.id,
      email: user.email,
      role: user.role,
      exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    }));
    const signature = btoa('mock-signature');
    
    return `${header}.${payload}.${signature}`;
  }

}
