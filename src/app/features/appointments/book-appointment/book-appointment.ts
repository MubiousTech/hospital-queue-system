import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AppointmentService } from '../../../core/services/appointment-service';
import { AppointmentType, AppointmentSlot } from '../../../core/models/patient.model';

@Component({
  selector: 'app-book-appointment',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './book-appointment.html',
  styleUrl: './book-appointment.css',
})
export class BookAppointment implements OnInit {
  appointmentForm!: FormGroup;
  AppointmentType = AppointmentType;
  availableDoctors: string[] = [];
  availableSlots: AppointmentSlot[] = [];

  submitted = false;
  showSuccess = false;
  bookedAppointmentId: string = '';

   appointmentTypes = [
    { value: AppointmentType.CONSULTATION, label: 'General Consultation' },
    { value: AppointmentType.FOLLOW_UP, label: 'Follow-up Visit' },
    { value: AppointmentType.SURGERY, label: 'Surgery' },
    { value: AppointmentType.LAB_TEST, label: 'Laboratory Test' },
    { value: AppointmentType.VACCINATION, label: 'Vaccination' }
  ];

  constructor(
    private fb: FormBuilder,
    private appointmentService: AppointmentService,
    private router: Router
  ) {}

   ngOnInit(): void {
    this.availableDoctors = this.appointmentService.getAvailableDoctors();
    this.initializeForm();
  }

   initializeForm(): void {
    const today = new Date().toISOString().split('T')[0];

    this.appointmentForm = this.fb.group({
      patientName: ['', [Validators.required, Validators.minLength(3)]],
      patientEmail: ['', [Validators.required, Validators.email]],
      patientPhone: ['', [Validators.required, Validators.pattern(/^0\d{10}$/)]],
      doctorName: ['', Validators.required],
      appointmentType: ['', Validators.required],
      appointmentDate: ['', [Validators.required, this.futureDateValidator]],
      appointmentTime: ['', Validators.required],
      reason: ['', [Validators.required, Validators.minLength(10)]],
      notes: ['']
    });

      // Load slots when doctor or date changes
    this.appointmentForm.get('doctorName')?.valueChanges.subscribe(() => {
      this.loadAvailableSlots();
    });

    this.appointmentForm.get('appointmentDate')?.valueChanges.subscribe(() => {
      this.loadAvailableSlots();
    });
  }

  futureDateValidator(control: any) {
    const selectedDate = new Date(control.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      return { pastDate: true };
    }
    return null;
  }

  loadAvailableSlots(): void {
    const doctorName = this.appointmentForm.get('doctorName')?.value;
    const dateValue = this.appointmentForm.get('appointmentDate')?.value;

    if (doctorName && dateValue) {
      const selectedDate = new Date(dateValue);
      this.availableSlots = this.appointmentService.getAvailableSlots(selectedDate, doctorName);
    } else {
      this.availableSlots = [];
    }
  }

  onSubmit(): void {
    this.submitted = true;

    if (this.appointmentForm.invalid) {
      return;
    }

  console.log('Form is valid');

    const formValue = this.appointmentForm.value;
    const appointmentData = {
      patientId: 'P-' + Date.now(),
      patientName: formValue.patientName,
      patientEmail: formValue.patientEmail,
      patientPhone: formValue.patientPhone,
      doctorName: formValue.doctorName,
      appointmentType: formValue.appointmentType,
      appointmentDate: new Date(formValue.appointmentDate),
      appointmentTime: formValue.appointmentTime,
      duration: 30,
      status: 'SCHEDULED' as any,
      reason: formValue.reason,
      notes: formValue.notes
    };

    const bookedAppointment = this.appointmentService.bookAppointment(appointmentData);
    this.bookedAppointmentId = bookedAppointment.id;
    this.showSuccess = true;

    setTimeout(() => {
      this.router.navigate(['/appointments']);
    }, 3000);
  }

  get f() {
    return this.appointmentForm.controls;
  }

  isSlotAvailable(time: string): boolean {
    const slot = this.availableSlots.find(s => s.time === time);
    return slot ? slot.available : false;
  }

}
