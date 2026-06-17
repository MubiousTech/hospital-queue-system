import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Queue } from '../../core/services/queue';
import { PatientServiceTs } from '../../core/services/patient.service.ts';
import { Auth } from '../../core/services/auth';
import { Notifications } from '../../core/services/notifications';
import { QueueEntry, MedicalRecord, Patient } from '../../core/models/patient.model';

@Component({
  selector: 'app-consultation',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './consultation.html',
  styleUrl: './consultation.css',
})
export class Consultation implements OnInit {
  queueEntryId: string = '';
  queueEntry: QueueEntry | null = null;
  currentRecord: MedicalRecord | null = null;
  pastHistory: MedicalRecord[] = [];

  isLoading = true;
  isSaving = false;
  loadError = '';

  consultForm: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private queueService: Queue,
    private patientService: PatientServiceTs,
    private authService: Auth,
    private notifications: Notifications,
    private cdr: ChangeDetectorRef,
  ) {
    this.consultForm = this.fb.group({
      diagnosis: ['', [Validators.required, Validators.minLength(5)]],
      treatment: ['', [Validators.required, Validators.minLength(5)]],
      medications: [''],
      doctorNotes: [''],
      followUpDate: [''],
    });
  }

  ngOnInit(): void {
    this.queueEntryId = this.route.snapshot.paramMap.get('queueEntryId') || '';
    this.loadConsultationData();
  }

  async loadConsultationData(): Promise<void> {
    this.isLoading = true;
    try {
      // Find the queue entry from the current queue state
      const queue = this.queueService.getCurrentQueue();
      const entry = queue.find((e) => e.id === this.queueEntryId);

      if (!entry) {
        this.loadError = 'Queue entry not found. The patient may have already been completed or removed.';
        return;
      }

      if (entry.status !== 'IN_PROGRESS') {
        this.loadError = 'This patient has not been called yet. Please call the patient before starting consultation.';
        return;
      }

      this.queueEntry = entry;

      // Load the medical record created during triage for THIS visit
      if (entry.medicalRecordId) {
        this.currentRecord = await this.patientService.getPatientMedicalRecord(entry.medicalRecordId);
      }

      // Load full past history (excluding today's still-open record)
      const fullHistory = await this.patientService.getPatientHistory(entry.patientId);
      this.pastHistory = fullHistory.filter((r) => r.id !== entry.medicalRecordId);

      // Pre-fill form if doctor already started typing before (e.g. page refresh)
      if (this.currentRecord?.diagnosis) {
        this.consultForm.patchValue({
          diagnosis: this.currentRecord.diagnosis,
          treatment: this.currentRecord.treatment || '',
          medications: this.currentRecord.medications || '',
          doctorNotes: this.currentRecord.doctorNotes || '',
          followUpDate: this.currentRecord.followUpDate
            ? new Date(this.currentRecord.followUpDate).toISOString().split('T')[0]
            : '',
        });
      }
    } catch (error) {
      console.error('Failed to load consultation data:', error);
      this.loadError = 'Failed to load patient data. Please try again.';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  get f() {
    return this.consultForm.controls;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.consultForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  onSubmit(): void {
    if (this.consultForm.invalid) {
      this.notifications.warning('Incomplete Form', 'Diagnosis and treatment are required before completing consultation.');
      this.consultForm.markAllAsTouched();
      return;
    }

    if (!this.queueEntry || !this.queueEntry.medicalRecordId) {
      this.notifications.error('Error', 'Cannot save — no linked medical record found.');
      return;
    }

    const v = this.consultForm.value;
    const doctorName = `Dr. ${this.authService.currentUserValue?.firstName || ''} ${this.authService.currentUserValue?.lastName || ''}`.trim();

    this.isSaving = true;

    this.patientService
      .updateMedicalRecord(this.queueEntry.medicalRecordId, {
        diagnosis: v.diagnosis,
        treatment: v.treatment,
        medications: v.medications || undefined,
        doctorNotes: v.doctorNotes || undefined,
        followUpDate: v.followUpDate ? new Date(v.followUpDate) : undefined,
        assignedDoctor: doctorName,
      })
      .then(() => {
        // Auto-complete the queue entry once consultation is saved
        return this.queueService.completePatient(this.queueEntry!.id);
      })
      .then(() => {
        this.notifications.success(
          'Consultation Completed',
          `${this.queueEntry?.patient.firstName} ${this.queueEntry?.patient.lastName}'s record has been updated and visit marked complete.`
        );
        setTimeout(() => this.router.navigate(['/queue']), 1200);
      })
      .catch((error) => {
        console.error('Failed to save consultation:', error);
        this.notifications.error('Save Failed', 'Could not save consultation. Please try again.');
      })
      .finally(() => {
        this.isSaving = false;
        this.cdr.detectChanges();
      });
  }

  cancel(): void {
    if (confirm('Discard this consultation and return to queue? Unsaved notes will be lost.')) {
      this.router.navigate(['/queue']);
    }
  }
}