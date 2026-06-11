import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { RouterLink } from '@angular/router';
import { UserRole } from '../../../core/models/user.model';

@Component({
  selector: 'app-register',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register implements OnInit {
  registerForm: FormGroup;
  submitted = false;
  mode: 'patient' | 'staff' = 'patient';
  userRoles = [UserRole.DOCTOR, UserRole.NURSE];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    this.registerForm = this.fb.group(
      {
        fullName: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        phone: ['', Validators.required],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', Validators.required],
        // staff-only
        role: [''],
        staffId: [''],
      },
      { validators: this.passwordsMatchValidator() },
    );
  }

  ngOnInit(): void {
    // Determine mode based on route path
    const url = this.router.url;
    if (url.includes('/admin/register-staff')) {
      this.setStaffMode();
    } else if (url.includes('/register')) {
      this.setPatientMode();
    }

    // If route parameters or query params provide mode, prefer them
    const routePath = this.route.snapshot.routeConfig?.path;
    if (routePath === 'register') this.setPatientMode();
    if (routePath === 'admin/register-staff') this.setStaffMode();
  }

  private setPatientMode(): void {
    this.mode = 'patient';
    // ensure role is patient and hide staff fields
    this.registerForm.get('role')?.setValue(UserRole.PATIENT);
    this.registerForm.get('role')?.disable();
    this.registerForm.get('staffId')?.clearValidators();
    this.registerForm.get('staffId')?.updateValueAndValidity();
  }

  private setStaffMode(): void {
    this.mode = 'staff';
    this.registerForm.get('role')?.setValidators(Validators.required);
    this.registerForm.get('staffId')?.setValidators(Validators.required);
    this.registerForm.get('role')?.enable();
    this.registerForm.get('role')?.updateValueAndValidity();
    this.registerForm.get('staffId')?.updateValueAndValidity();
  }

  // Validator to ensure password and confirmPassword match
  private passwordsMatchValidator(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const pw = group.get('password')?.value;
      const cpw = group.get('confirmPassword')?.value;
      return pw && cpw && pw !== cpw ? { passwordsMismatch: true } : null;
    };
  }

  get f() {
    return this.registerForm.controls;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.registerForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched || this.submitted));
  }

  getErrorMessage(fieldName: string): string {
    const field = this.registerForm.get(fieldName);
    if (!field) return '';
    if (field.hasError('required')) return `${this.capitalize(fieldName)} is required`;
    if (field.hasError('email')) return 'Please enter a valid email address';
    if (field.hasError('minlength'))
      return `${this.capitalize(fieldName)} must be at least ${field.errors?.['minlength'].requiredLength} characters`;
    if (this.registerForm.hasError('passwordsMismatch')) return 'Passwords do not match';
    return '';
  }

  private capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.registerForm.invalid) return;

    // Build payload
    const fullName: string = this.registerForm.get('fullName')?.value || '';
    const [firstName, ...rest] = fullName.trim().split(' ');
    const lastName = rest.join(' ') || '';

    const payload: any = {
      firstName,
      lastName,
      email: this.registerForm.get('email')?.value,
      phoneNumber: this.registerForm.get('phone')?.value,
      password: this.registerForm.get('password')?.value,
      role: this.mode === 'patient' ? UserRole.PATIENT : this.registerForm.get('role')?.value,
    };

    if (this.mode === 'staff') {
      payload.staffId = this.registerForm.get('staffId')?.value;
    }

    // TODO: Replace with real registration API call
    console.log('Register payload:', payload);
    alert('Registration successful (mock)');

    // Redirect after successful registration
    if (this.mode === 'patient') {
      this.router.navigate(['/login']);
    } else {
      this.router.navigate(['/admin']);
    }
  }
}
