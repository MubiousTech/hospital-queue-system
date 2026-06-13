import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AppointmentService } from '../../../core/services/appointment-service';
import {
  DoctorScheduleService,
  DoctorSchedule,
  TimeSlot,
} from '../../../core/services/doctor-schedule.service';
import { Notifications } from '../../../core/services/notifications';
import { AppointmentType, AppointmentStatus } from '../../../core/models/patient.model';

@Component({
  selector: 'app-book-appointment',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './book-appointment.html',
  styleUrl: './book-appointment.css',
})
export class BookAppointment implements OnInit, OnDestroy {
  appointmentForm!: FormGroup;
  AppointmentType = AppointmentType;

  doctors: DoctorSchedule[] = [];
  selectedDoctor: DoctorSchedule | null = null;
  availableSlots: TimeSlot[] = [];
  isLoadingSlots = false;
  isDoctorUnavailable = false;

  submitted = false;
  isSubmitting = false;
  showSuccess = false;
  bookedAppointmentId = '';

  appointmentTypes = [
    { value: AppointmentType.CONSULTATION, label: '🩺 General Consultation', duration: 30 },
    { value: AppointmentType.FOLLOW_UP, label: '🔄 Follow-up Visit', duration: 20 },
    { value: AppointmentType.SURGERY, label: '⚕️ Surgery', duration: 120 },
    { value: AppointmentType.LAB_TEST, label: '🧪 Laboratory Test', duration: 45 },
    { value: AppointmentType.VACCINATION, label: '💉 Vaccination', duration: 15 },
  ];

  today = new Date().toISOString().split('T')[0];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private appointmentService: AppointmentService,
    private doctorScheduleService: DoctorScheduleService,
    private notifications: Notifications,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.doctors = this.doctorScheduleService.getDoctors();
    this.initForm();

    // Reload appointments so slot checking uses fresh data
    this.appointmentService.loadAppointments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initForm(): void {
    this.appointmentForm = this.fb.group({
      patientName: ['', [Validators.required, Validators.minLength(3)]],
      patientEmail: ['', [Validators.required, Validators.email]],
      patientPhone: ['', [Validators.required, Validators.pattern(/^0\d{10}$/)]],
      doctorName: ['', Validators.required],
      appointmentType: ['', Validators.required],
      appointmentDate: ['', [Validators.required, this.futureDateValidator]],
      appointmentTime: ['', Validators.required],
      reason: ['', [Validators.required, Validators.minLength(10)]],
      notes: [''],
    });

    // When doctor changes — update selected doctor info, reload slots
    this.appointmentForm
      .get('doctorName')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((name) => {
        this.selectedDoctor = this.doctorScheduleService.getDoctorByName(name) || null;
        this.appointmentForm.patchValue({ appointmentTime: '' });
        this.loadSlots();
      });

    // When date changes — reload slots
    this.appointmentForm
      .get('appointmentDate')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.appointmentForm.patchValue({ appointmentTime: '' });
        this.loadSlots();
      });

    // When appointment type changes — reload slots (duration changes)
    this.appointmentForm
      .get('appointmentType')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.appointmentForm.patchValue({ appointmentTime: '' });
        this.loadSlots();
      });
  }

  futureDateValidator(control: any) {
    const selected = new Date(control.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selected < today ? { pastDate: true } : null;
  }

  loadSlots(): void {
    const doctorName = this.appointmentForm.get('doctorName')?.value;
    const dateValue = this.appointmentForm.get('appointmentDate')?.value;
    const aptType = this.appointmentForm.get('appointmentType')?.value;

    if (!doctorName || !dateValue || !aptType) {
      this.availableSlots = [];
      this.isDoctorUnavailable = false;
      return;
    }

    this.isLoadingSlots = true;
    const date = new Date(dateValue);

    // Check if doctor works this day
    if (!this.doctorScheduleService.isDoctorAvailableOnDate(doctorName, date)) {
      this.availableSlots = [];
      this.isDoctorUnavailable = true;
      this.isLoadingSlots = false;
      return;
    }

    this.isDoctorUnavailable = false;
    this.availableSlots = this.appointmentService.getAvailableSlots(date, doctorName, aptType);
    this.isLoadingSlots = false;
  }

  getAvailableCount(): number {
    return this.availableSlots.filter((s) => s.available).length;
  }

  getDurationLabel(): string {
    const aptType = this.appointmentForm.get('appointmentType')?.value;
    if (!aptType) return '';
    const duration = this.doctorScheduleService.getDuration(aptType);
    return duration >= 60
      ? `${Math.floor(duration / 60)}h ${duration % 60 > 0 ? (duration % 60) + 'min' : ''}`
      : `${duration} min`;
  }

  get f() {
    return this.appointmentForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.appointmentForm.invalid) return;

    const formValue = this.appointmentForm.value;
    const aptType = formValue.appointmentType;
    const duration = this.doctorScheduleService.getDuration(aptType);

    this.isSubmitting = true;

    const appointmentData = {
      patientId: 'P-' + Date.now(),
      patientName: formValue.patientName,
      patientEmail: formValue.patientEmail,
      patientPhone: formValue.patientPhone,
      doctorName: formValue.doctorName,
      appointmentType: aptType,
      appointmentDate: new Date(formValue.appointmentDate),
      appointmentTime: formValue.appointmentTime,
      duration: duration,
      status: AppointmentStatus.SCHEDULED,
      reason: formValue.reason,
      notes: formValue.notes || null,
    };

    this.appointmentService
      .bookAppointment(appointmentData)
      .then((booked) => {
        this.bookedAppointmentId = booked.id;
        this.showSuccess = true;
        this.isSubmitting = false;
        this.notifications.success(
          'Appointment Booked',
          `Your appointment with ${formValue.doctorName} has been scheduled.`,
        );
        setTimeout(() => this.router.navigate(['/appointments']), 3000);
      })
      .catch((error) => {
        this.isSubmitting = false;
        this.notifications.error('Booking Failed', error.message || 'Failed to book appointment.');
        // Reload slots in case of conflict
        this.loadSlots();
      });
  }

  getWorkingDaysLabel(doctor: DoctorSchedule): string {
    return this.doctorScheduleService.getWorkingDaysLabel(doctor);
  }

  getWorkingHoursLabel(doctor: DoctorSchedule): string {
    return this.doctorScheduleService.getWorkingHoursLabel(doctor);
  }
}
