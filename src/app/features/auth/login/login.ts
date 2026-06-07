import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LoginRequest ,UserRole } from '../../../core/models/user.model';
import { passwordStrengthValidator } from '../../../core/validators/password-strength.validator';
import { Auth } from '../../../core/services/auth';

@Component({
  selector: 'app-login',
  imports: [
    CommonModule,
    ReactiveFormsModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  loginForm: FormGroup;
  submitted = false;
  loginError = '';
 isLoading = false;  // ← ADD THIS for loading state
  
  userRoles = Object.values(UserRole);

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private auth: Auth  // ← ADD THIS (Dependency Injection)
  ) {
    // Redirect if already logged in
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }

    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required, 
        Validators.minLength(6),
        passwordStrengthValidator()
      ]],
      role: ['', Validators.required]
    });
  }

  get f() {
    return this.loginForm.controls;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched || this.submitted));
  }

  getErrorMessage(fieldName: string): string {
    const field = this.loginForm.get(fieldName);
    
    if (field?.hasError('required')) {
      return `${this.capitalize(fieldName)} is required`;
    }
    
    if (field?.hasError('email')) {
      return 'Please enter a valid email address';
    }
    
    if (field?.hasError('minlength')) {
      const minLength = field.errors?.['minlength'].requiredLength;
      return `Password must be at least ${minLength} characters`;
    }
    
    if (field?.hasError('passwordStrength')) {
      return 'Password must contain uppercase, lowercase, and number';
    }
    
    return '';
  }

  private capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  // ← UPDATED METHOD
  onSubmit(): void {
    this.submitted = true;
    this.loginError = '';

    if (this.loginForm.invalid) {
      return;
    }

    this.isLoading = true;  // Show loading state
    const loginData: LoginRequest = this.loginForm.value;

    // Call AuthService
    this.auth.login(loginData).subscribe({
      next: (response) => {
        console.log('Login response:', response);
        this.isLoading = false;
        
        // Navigate based on role
        this.redirectBasedOnRole(loginData.role);
      },
      error: (error) => {
        console.error('Login error:', error);
        this.isLoading = false;
        this.loginError = error.message || 'Login failed. Please try again.';
      }
    });
  }

  private redirectBasedOnRole(role: string): void {
    switch (role) {
      case UserRole.ADMIN:
        this.router.navigate(['/admin']);
        break;
      case UserRole.DOCTOR:
      case UserRole.NURSE:
        this.router.navigate(['/dashboard']);
        break;
      case UserRole.PATIENT:
        this.router.navigate(['/appointments']);
        break;
      default:
        this.router.navigate(['/dashboard']);
    }
  }
}

