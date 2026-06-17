import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { PatientServiceTs } from '../../core/services/patient.service.ts';
import { Notifications } from '../../core/services/notifications';
import {
  Patient,
  MedicalRecord,
  MaritalStatus,
  BloodGroup,
  Genotype,
} from '../../core/models/patient.model';

@Component({
  selector: 'app-health-record',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './health-record.html',
  styleUrl: './health-record.css',
})
export class HealthRecord implements OnInit {
  activeTab: 'overview' | 'register' | 'search' | 'history' = 'overview';

  // Overview stats
  totalPatients = 0;
  newToday = 0;
  returningPatients = 0;
  totalMedicalRecords = 0;
  isLoadingStats = false;

  // Register form
  registerForm: FormGroup;
  submitted = false;
  isRegistering = false;

  maritalStatuses = Object.values(MaritalStatus);
  bloodGroups = Object.values(BloodGroup);
  genotypes = Object.values(Genotype);

  // Search / list
  searchTerm = '';
  allPatients: Patient[] = [];
  filteredPatients: Patient[] = [];
  isLoadingPatients = false;

  // Edit
  editingPatient: Patient | null = null;
  editForm: FormGroup;
  isSaving = false;

  // History
  historyPatient: Patient | null = null;
  historyRecords: MedicalRecord[] = [];
  isLoadingHistory = false;

  constructor(
    private fb: FormBuilder,
    private patientService: PatientServiceTs,
    private notifications: Notifications,
  ) {
    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      age: ['', [Validators.required, Validators.min(0), Validators.max(120)]],
      gender: ['', Validators.required],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^0[0-9]{10}$/)]],
      email: ['', [Validators.email]],

      address: [''],
      occupation: [''],
      maritalStatus: [''],
      nextOfKin: [''],
      nextOfKinPhone: [''],
      emergencyContact: [''],

      bloodGroup: [''],
      genotype: [''],
      allergies: [''],
      chronicConditions: [''],
    });

    this.editForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      age: ['', [Validators.required, Validators.min(0), Validators.max(120)]],
      gender: ['', Validators.required],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^0[0-9]{10}$/)]],
      email: ['', [Validators.email]],
      address: [''],
      occupation: [''],
      maritalStatus: [''],
      nextOfKin: [''],
      nextOfKinPhone: [''],
      emergencyContact: [''],
    });
  }

ngOnInit(): void {
  console.log('🟢 ngOnInit STARTED');

  // TEMPORARY DIRECT TEST — with same query params as getAllPatients()
  Promise.all([
    import('../../core/services/appwrite.config'),
    import('appwrite'),
  ]).then(([{ databases, DB_ID, COLLECTIONS }, { Query }]) => {
    console.log('🟢 About to call listDocuments WITH query params');
    databases.listDocuments(DB_ID, COLLECTIONS.PATIENTS, [
      Query.limit(200),
      Query.orderDesc('$createdAt'),
    ])
      .then((res) => console.log('🟢 QUERY CALL SUCCESS:', res.total))
      .catch((err) => console.log('🔴 QUERY CALL ERROR:', err));
  });

  this.loadOverviewStats();
  this.loadAllPatients();
}

  switchTab(tab: 'overview' | 'register' | 'search' | 'history'): void {
    this.activeTab = tab;
    if (tab === 'overview') this.loadOverviewStats();
    if (tab === 'search') this.loadAllPatients();
  }

  // ─────────────────────────────────────────────
  // OVERVIEW
  // ─────────────────────────────────────────────

  async loadOverviewStats(): Promise<void> {
    console.log('🔵 loadOverviewStats STARTED');
    this.isLoadingStats = true;
    try {
      const patients = await this.patientService.getAllPatients();
      this.totalPatients = patients.length;

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      this.newToday = patients.filter((p) => new Date(p.registrationDate) >= startOfToday).length;

      // Fetch all histories in PARALLEL instead of one at a time
      const histories = await Promise.all(
        patients.map((p) => this.patientService.getPatientHistory(p.id).catch(() => [])),
      );

      let returningCount = 0;
      let totalRecords = 0;
      for (const history of histories) {
        totalRecords += history.length;
        if (history.length > 1) returningCount++;
      }

      this.returningPatients = returningCount;
      this.totalMedicalRecords = totalRecords;
    } catch (error) {
      this.notifications.error('Error', 'Failed to load dashboard statistics.');
    } finally {
      this.isLoadingStats = false;
    }
  }

  // ─────────────────────────────────────────────
  // REGISTER NEW PATIENT
  // ─────────────────────────────────────────────

  get f() {
    return this.registerForm.controls;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.registerForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched || this.submitted));
  }

  getErrorMessage(fieldName: string): string {
    const field = this.registerForm.get(fieldName);
    if (field?.hasError('required')) return `${this.capitalize(fieldName)} is required`;
    if (field?.hasError('minlength'))
      return `Minimum ${field.errors?.['minlength'].requiredLength} characters required`;
    if (field?.hasError('pattern'))
      return 'Enter a valid Nigerian phone number (e.g., 08012345678)';
    if (field?.hasError('email')) return 'Enter a valid email address';
    if (field?.hasError('min') || field?.hasError('max')) return 'Enter a valid age';
    return '';
  }

  private capitalize(text: string): string {
    return text
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .replace(/^./, (s) => s.toUpperCase());
  }

  onRegisterSubmit(): void {
    this.submitted = true;
    if (this.registerForm.invalid) {
      this.notifications.warning('Invalid Input', 'Please fill in all required fields correctly.');
      return;
    }

    const v = this.registerForm.value;
    this.isRegistering = true;

    this.patientService
      .createPatient({
        firstName: v.firstName,
        lastName: v.lastName,
        age: v.age,
        gender: v.gender,
        phoneNumber: v.phoneNumber,
        email: v.email || undefined,
        address: v.address || undefined,
        occupation: v.occupation || undefined,
        maritalStatus: v.maritalStatus || undefined,
        nextOfKin: v.nextOfKin || undefined,
        nextOfKinPhone: v.nextOfKinPhone || undefined,
        emergencyContact: v.emergencyContact || undefined,
        bloodGroup: v.bloodGroup || undefined,
        genotype: v.genotype || undefined,
        allergies: v.allergies || undefined,
        chronicConditions: v.chronicConditions || undefined,
      })
      .then((patient) => {
        this.notifications.success(
          'Patient Registered',
          `${patient.firstName} ${patient.lastName} registered as ${patient.patientNumber}`,
        );
        this.resetRegisterForm();
        this.loadOverviewStats();
      })
      .catch(() => {
        this.notifications.error(
          'Registration Failed',
          'Could not register patient. Please try again.',
        );
      })
      .finally(() => {
        this.isRegistering = false;
      });
  }

  resetRegisterForm(): void {
    this.registerForm.reset();
    this.submitted = false;
  }

  // ─────────────────────────────────────────────
  // SEARCH / LIST PATIENTS
  // ─────────────────────────────────────────────

  async loadAllPatients(): Promise<void> {
    this.isLoadingPatients = true;
    try {
      this.allPatients = await this.patientService.getAllPatients();
      this.filteredPatients = this.allPatients;
    } catch (error) {
      this.notifications.error('Error', 'Failed to load patients.');
    } finally {
      this.isLoadingPatients = false;
    }
  }

  async onSearchChange(): Promise<void> {
    if (!this.searchTerm.trim()) {
      this.filteredPatients = this.allPatients;
      return;
    }
    try {
      this.filteredPatients = await this.patientService.searchPatients(this.searchTerm);
    } catch (error) {
      this.filteredPatients = [];
      this.notifications.error('Search Failed', 'Could not search patients.');
    }
  }

  // ─────────────────────────────────────────────
  // EDIT PATIENT (demographic fields only)
  // ─────────────────────────────────────────────

  openEdit(patient: Patient): void {
    this.editingPatient = patient;
    this.editForm.patchValue({
      firstName: patient.firstName,
      lastName: patient.lastName,
      age: patient.age,
      gender: patient.gender,
      phoneNumber: patient.phoneNumber,
      email: patient.email || '',
      address: patient.address || '',
      occupation: patient.occupation || '',
      maritalStatus: patient.maritalStatus || '',
      nextOfKin: patient.nextOfKin || '',
      nextOfKinPhone: patient.nextOfKinPhone || '',
      emergencyContact: patient.emergencyContact || '',
    });
  }

  closeEdit(): void {
    this.editingPatient = null;
    this.editForm.reset();
  }

  saveEdit(): void {
    if (!this.editingPatient || this.editForm.invalid) {
      this.notifications.warning('Invalid Input', 'Please correct the form before saving.');
      return;
    }

    const v = this.editForm.value;
    this.isSaving = true;

    this.patientService
      .updatePatient(this.editingPatient.id, {
        firstName: v.firstName,
        lastName: v.lastName,
        age: v.age,
        gender: v.gender,
        phoneNumber: v.phoneNumber,
        email: v.email || undefined,
        address: v.address || undefined,
        occupation: v.occupation || undefined,
        maritalStatus: v.maritalStatus || undefined,
        nextOfKin: v.nextOfKin || undefined,
        nextOfKinPhone: v.nextOfKinPhone || undefined,
        emergencyContact: v.emergencyContact || undefined,
      })
      .then(() => {
        this.notifications.success('Updated', 'Patient information updated successfully.');
        this.closeEdit();
        this.loadAllPatients();
      })
      .catch(() => {
        this.notifications.error('Update Failed', 'Could not update patient. Please try again.');
      })
      .finally(() => {
        this.isSaving = false;
      });
  }

  // ─────────────────────────────────────────────
  // VIEW PATIENT HISTORY
  // ─────────────────────────────────────────────

  async viewHistory(patient: Patient): Promise<void> {
    this.historyPatient = patient;
    this.activeTab = 'history';
    this.isLoadingHistory = true;
    try {
      this.historyRecords = await this.patientService.getPatientHistory(patient.id);
    } catch (error) {
      this.notifications.error('Error', 'Failed to load patient history.');
    } finally {
      this.isLoadingHistory = false;
    }
  }

  closeHistory(): void {
    this.historyPatient = null;
    this.historyRecords = [];
    this.activeTab = 'search';
  }

  async deletePatient(patient: Patient): Promise<void> {
    if (
      !confirm(
        `Delete patient record for ${patient.firstName} ${patient.lastName}? This cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      await this.patientService.deletePatient(patient.id);
      this.notifications.warning(
        'Deleted',
        `${patient.firstName} ${patient.lastName}'s record has been deleted.`,
      );
      this.loadAllPatients();
      this.loadOverviewStats();
    } catch (error) {
      this.notifications.error('Error', 'Failed to delete patient record.');
    }
  }
}
