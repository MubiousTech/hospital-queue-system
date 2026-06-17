import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  FormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { Queue } from '../../../core/services/queue';
import { PatientServiceTs } from '../../../core/services/patient.service.ts';
import { Patient, PatientPriority, MedicalConditions } from '../../../core/models/patient.model';
import { Notifications } from '../../../core/services/notifications';

@Component({
  selector: 'app-add-patient',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './add-patient.html',
  styleUrl: './add-patient.css',
})
export class AddPatient implements OnInit {
  triageForm: FormGroup;
  submitted = false;
  showVitalSigns = false;
  isSubmitting = false;

  // Patient search state
  searchTerm = '';
  searchResults: Patient[] = [];
  selectedPatient: Patient | null = null;
  isSearching = false;

  medicalConditions = Object.values(MedicalConditions);
  priorities = Object.values(PatientPriority);

  constructor(
    private formBuilder: FormBuilder,
    private queueService: Queue,
    private patientService: PatientServiceTs,
    private notifications: Notifications,
    private router: Router,
  ) {
    this.triageForm = this.formBuilder.group({
      medicalCondition: ['', Validators.required],
      symptoms: ['', [Validators.required, Validators.minLength(10)]],
      priority: ['', Validators.required],

      bloodPressure: [''],
      heartRate: ['', [Validators.min(30), Validators.max(220)]],
      temperature: ['', [Validators.min(30), Validators.max(45)]],
      oxygenSaturation: ['', [Validators.min(0), Validators.max(100)]],

      nurseNotes: [''],
    });
  }

  ngOnInit(): void {
    this.triageForm.get('medicalCondition')?.valueChanges.subscribe((condition) => {
      let priority: PatientPriority;

      switch (condition) {
        case MedicalConditions.CARDIAC_ARREST:
        case MedicalConditions.SEVERE_TRAUMA:
        case MedicalConditions.STROKE:
        case MedicalConditions.RESPIRATORY_FAILURE:
          priority = PatientPriority.CRITICAL;
          break;
        case MedicalConditions.FRACTURE:
        case MedicalConditions.FEVER:
        case MedicalConditions.ABDOMINAL_PAIN:
        case MedicalConditions.MINOR_INJURY:
          priority = PatientPriority.REGULAR;
          break;
        case MedicalConditions.COLD_FLU:
        case MedicalConditions.ROUTINE_CHECKUP:
        case MedicalConditions.VACCINATION:
        case MedicalConditions.PRESCRIPTION_REFILL:
          priority = PatientPriority.DELAYED;
          break;
        default:
          priority = PatientPriority.REGULAR;
      }

      this.triageForm.patchValue({ priority });
    });

    this.triageForm.get('priority')?.valueChanges.subscribe((priority) => {
      if (priority === PatientPriority.CRITICAL) {
        this.showVitalSigns = true;
        this.triageForm.get('bloodPressure')?.setValidators(Validators.required);
        this.triageForm
          .get('heartRate')
          ?.setValidators([Validators.required, Validators.min(30), Validators.max(220)]);
        this.triageForm
          .get('temperature')
          ?.setValidators([Validators.required, Validators.min(30), Validators.max(45)]);
        this.triageForm
          .get('oxygenSaturation')
          ?.setValidators([Validators.required, Validators.min(0), Validators.max(100)]);
      } else {
        this.showVitalSigns = false;
        this.triageForm.get('bloodPressure')?.clearValidators();
        this.triageForm.get('heartRate')?.setValidators([Validators.min(30), Validators.max(220)]);
        this.triageForm.get('temperature')?.setValidators([Validators.min(30), Validators.max(45)]);
        this.triageForm
          .get('oxygenSaturation')
          ?.setValidators([Validators.min(0), Validators.max(100)]);
      }

      this.triageForm.get('bloodPressure')?.updateValueAndValidity();
      this.triageForm.get('heartRate')?.updateValueAndValidity();
      this.triageForm.get('temperature')?.updateValueAndValidity();
      this.triageForm.get('oxygenSaturation')?.updateValueAndValidity();
    });
  }

  // ─────────────────────────────────────────────
  // PATIENT SEARCH
  // ─────────────────────────────────────────────

  async onSearchChange(): Promise<void> {
    if (!this.searchTerm.trim()) {
      this.searchResults = [];
      return;
    }

    this.isSearching = true;
    try {
      this.searchResults = await this.patientService.searchPatients(this.searchTerm);
    } catch (error) {
      this.searchResults = [];
      this.notifications.error('Search Failed', 'Could not search patients. Please try again.');
    } finally {
      this.isSearching = false;
    }
  }

  selectPatient(patient: Patient): void {
    this.selectedPatient = patient;
    this.searchResults = [];
    this.searchTerm = `${patient.firstName} ${patient.lastName} (${patient.patientNumber})`;
  }

  clearSelectedPatient(): void {
    this.selectedPatient = null;
    this.searchTerm = '';
    this.searchResults = [];
  }

  get f() {
    return this.triageForm.controls;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.triageForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched || this.submitted));
  }

  getErrorMessage(fieldName: string): string {
    const field = this.triageForm.get(fieldName);

    if (field?.hasError('required')) return `${this.capitalize(fieldName)} is required`;
    if (field?.hasError('minlength')) {
      const minLength = field.errors?.['minlength'].requiredLength;
      return `Minimum ${minLength} characters required`;
    }
    if (field?.hasError('min')) return `Value must be at least ${field.errors?.['min'].min}`;
    if (field?.hasError('max')) return `Value must not exceed ${field.errors?.['max'].max}`;

    return '';
  }

  private capitalize(text: string): string {
    return text
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .replace(/^./, (str) => str.toUpperCase());
  }

  // ─────────────────────────────────────────────
  // SUBMIT — start triage for the selected, existing patient
  // ─────────────────────────────────────────────

  onSubmit(): void {
    this.submitted = true;

    if (!this.selectedPatient) {
      this.notifications.warning(
        'No Patient Selected',
        'Please search for and select a registered patient first.',
      );
      return;
    }

    if (this.triageForm.invalid) {
      this.notifications.warning('Invalid Input', 'Please fill in all required fields correctly.');
      return;
    }

    const priority: PatientPriority = this.triageForm.value.priority;
    const medicalCondition: MedicalConditions = this.triageForm.value.medicalCondition;
    const symptoms: string = this.triageForm.value.symptoms;
    const nurseNotes = this.triageForm.value.nurseNotes || undefined;

    let vitalSigns;
    if (this.showVitalSigns && this.triageForm.value.bloodPressure) {
      vitalSigns = {
        bloodPressure: this.triageForm.value.bloodPressure,
        heartRate: this.triageForm.value.heartRate,
        temperature: this.triageForm.value.temperature,
        oxygenSaturation: this.triageForm.value.oxygenSaturation,
      };
    }

    this.isSubmitting = true;

    this.queueService
      .addToQueue(
        this.selectedPatient,
        priority,
        medicalCondition,
        symptoms,
        vitalSigns,
        nurseNotes,
      )
      .then((queueEntry) => {
        this.notifications.success(
          'Patient Added to Queue',
          `${this.selectedPatient!.firstName} ${this.selectedPatient!.lastName} added at position #${queueEntry.queuePosition}`,
        );
        setTimeout(() => this.router.navigate(['/queue']), 1200);
      })
      .catch(() => {
        this.notifications.error('Failed', 'Could not add patient to queue. Please try again.');
      })
      .finally(() => {
        this.isSubmitting = false;
      });
  }

  resetForm(): void {
    this.triageForm.reset();
    this.submitted = false;
    this.showVitalSigns = false;
    this.clearSelectedPatient();
  }

  cancel(): void {
    if (confirm('Are you sure you want to cancel? All entered data will be lost.')) {
      this.router.navigate(['/queue']);
    }
  }
}
