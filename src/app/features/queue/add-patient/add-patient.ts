import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Queue } from '../../../core/services/queue';
import { Patient, PatientPriority, MedicalConditions } from '../../../core/models/patient.model';

@Component({
  selector: 'app-add-patient',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-patient.html',
  styleUrl: './add-patient.css',
})
export class AddPatient implements OnInit {
  patientForm: FormGroup;
  submitted = false;
  showVitalSigns = false;

  //Expose enums to template
  medicalConditions = Object.values(MedicalConditions);
  priorities = Object.values(PatientPriority);

  //Patient Id counter (in real app)
  private patientIdCounter = 5;

  constructor(
    private formBuilder: FormBuilder,
    private queueService: Queue,
    private router: Router,
  ) {
    this.patientForm = this.formBuilder.group({
      //patient info
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      age: ['', [Validators.required, Validators.min(0), Validators.max(120)]],
      gender: ['', Validators.required],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^0[0-9]{10}$/)]],
      email: ['', [Validators.email]],

      //Medical Info
      medicalCondition: ['', Validators.required],
      symptoms: ['', [Validators.required, Validators.minLength(10)]],
      priority: ['', Validators.required],

      //Vital Signs (Optional but important for critical patient)
      bloodPressure: [''],
      heartRate: ['', [Validators.min(30), Validators.max(220)]],
      temperature: ['', [Validators.min(30), Validators.max(45)]],
      oxygenSaturation: ['', [Validators.min(0), Validators.max(100)]],

      //Nurse note
      nurseNotes: [''],
    });
  }

  ngOnInit(): void {
    this.patientForm.get('medicalCondition')?.valueChanges.subscribe((condition) => {
      let priority: PatientPriority;

      switch (condition) {
        // Critical conditions
        case MedicalConditions.CARDIAC_ARREST:
        case MedicalConditions.SEVERE_TRAUMA:
        case MedicalConditions.STROKE:
        case MedicalConditions.RESPIRATORY_FAILURE:
          priority = PatientPriority.CRITICAL;
          break;

        // Regular conditions
        case MedicalConditions.FRACTURE:
        case MedicalConditions.FEVER:
        case MedicalConditions.ABDOMINAL_PAIN:
        case MedicalConditions.MINOR_INJURY:
          priority = PatientPriority.REGULAR;
          break;

        // Delayed conditions
        case MedicalConditions.COLD_FLU:
        case MedicalConditions.ROUTINE_CHECKUP:
        case MedicalConditions.VACCINATION:
        case MedicalConditions.PRESCRIPTION_REFILL:
          priority = PatientPriority.DELAYED;
          break;

        default:
          priority = PatientPriority.REGULAR;
      }

      // Automatically update priority field
      this.patientForm.patchValue({
        priority: priority,
      });
    });

    //Watch priority changes to show/hide vital signs

    this.patientForm.get('priority')?.valueChanges.subscribe((priority) => {
      if (priority === PatientPriority.CRITICAL) {
        this.showVitalSigns = true;
        //Make vital signs required for critical patients

        this.patientForm.get('bloodPressure')?.setValidators(Validators.required);

        this.patientForm
          .get('heartRate')
          ?.setValidators([Validators.required, Validators.min(30), Validators.max(220)]);

        this.patientForm
          .get('temperature')
          ?.setValidators([Validators.required, Validators.min(30), Validators.max(45)]);

        this.patientForm
          .get('oxygenSaturation')
          ?.setValidators([Validators.required, Validators.min(0), Validators.max(100)]);
      } else {
        this.showVitalSigns = false;
        //Remove required validation from non-critical
        this.patientForm.get('bloodPressure')?.clearValidators();

        this.patientForm.get('heartRate')?.setValidators([Validators.min(30), Validators.max(220)]);

        this.patientForm
          .get('temperature')
          ?.setValidators([Validators.min(30), Validators.max(45)]);

        this.patientForm
          .get('oxygenSaturation')
          ?.setValidators([Validators.min(0), Validators.max(100)]);
      }

      // Update validators
      this.patientForm.get('bloodPressure')?.updateValueAndValidity();
      this.patientForm.get('heartRate')?.updateValueAndValidity();
      this.patientForm.get('temperature')?.updateValueAndValidity();
      this.patientForm.get('oxygenSaturation')?.updateValueAndValidity();
    });
  }

  // Getter for easy access to form controls
  get f() {
    return this.patientForm.controls;
  }

  // Check if field is invalid
  isFieldInvalid(fieldName: string): boolean {
    const field = this.patientForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched || this.submitted));
  }

  //Get error message for field
  getErrorMessage(fieldName: string): string {
    const field = this.patientForm.get(fieldName);

    if (field?.hasError('required')) {
      return `${this.capitalize(fieldName)} is required`;
    }

    if (field?.hasError('minlength')) {
      const minLength = field.errors?.['minlength'].requiredLength;
      return `Minimum ${minLength} characters required`;
    }

    if (field?.hasError('min')) {
      const min = field.errors?.['min'].min;
      return `Value must be at least ${min}`;
    }

    if (field?.hasError('max')) {
      const max = field.errors?.['max'].max;
      return `Value must not exceed ${max}`;
    }

    if (field?.hasError('pattern')) {
      return 'Please enter a valid Nigerian phone number (e.g., 08012345678)';
    }

    if (field?.hasError('email')) {
      return 'Please enter a valid email address';
    }

    return '';
  }

  //Capitalize first letter
  private capitalize(text: string): string {
    return text
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .replace(/^./, (str) => str.toUpperCase());
  }

  //Handle form submission
  onSubmit(): void {
    this.submitted = true;

    if (this.patientForm.invalid) {
      alert('⚠️ Please fill in all required fields correctly.');
      return;
    }

    const patient: Patient = {
      id: '', // Appwrite generates the real ID
      firstName: this.patientForm.value.firstName,
      lastName: this.patientForm.value.lastName,
      age: this.patientForm.value.age,
      gender: this.patientForm.value.gender,
      phoneNumber: this.patientForm.value.phoneNumber,
      email: this.patientForm.value.email || undefined,
      medicalCondition: this.patientForm.value.medicalCondition,
      symptoms: this.patientForm.value.symptoms,
      registrationDate: new Date(),
    };

    if (this.showVitalSigns && this.patientForm.value.bloodPressure) {
      patient.vitalSigns = {
        bloodPressure: this.patientForm.value.bloodPressure,
        heartRate: this.patientForm.value.heartRate,
        temperature: this.patientForm.value.temperature,
        oxygenSaturation: this.patientForm.value.oxygenSaturation,
      };
    }

    const priority: PatientPriority = this.patientForm.value.priority;
    const nurseNotes = this.patientForm.value.nurseNotes || undefined;

    // addToQueue is now async
    this.queueService
      .addToQueue(patient, priority, nurseNotes)
      .then((queueEntry) => {
        alert(`✅ Patient registered successfully!

Name: ${patient.firstName} ${patient.lastName}
Priority: ${priority}
Queue Position: #${queueEntry.queuePosition}
Estimated Wait: ${queueEntry.estimatedWaitTime} minutes

Patient has been added to the queue.`);

        this.router.navigate(['/queue']);
      })
      .catch((error) => {
        console.error('Failed to add patient:', error);
        alert('❌ Failed to register patient. Please try again.');
      });
  }

  // Reset form
  resetForm(): void {
    this.patientForm.reset();
    this.submitted = false;
    this.showVitalSigns = false;
  }

  // Cancel and go back
  cancel(): void {
    if (confirm('Are you sure you want to cancel? All entered data will be lost.')) {
      this.router.navigate(['/queue']);
    }
  }
}
