/**
 * Patient Priority Levels
 * Based on medical triage standards
 */
export enum PatientPriority {
  CRITICAL = 'CRITICAL', //Life threatening conditions
  REGULAR = 'REGULAR', //Standard medical needs
  DELAYED = 'DELAYED', //Non-urgent cases
}

// Patient Medical Condition Categories
export enum MedicalConditions {
  //Critical Conditions
  CARDIAC_ARREST = 'Cardiac Arrest',
  SEVERE_TRAUMA = 'Severe Trauma',
  STROKE = 'Stroke',
  RESPIRATORY_FAILURE = 'Respiratory Failure',

  //Regular conditions
  FRACTURE = 'Fracture',
  FEVER = 'High Fever',
  ABDOMINAL_PAIN = 'Abdominal Pain',
  MINOR_INJURY = 'Minor Injury',

  // Delayed conditions
  COLD_FLU = 'Cold/Flu',
  ROUTINE_CHECKUP = 'Routine Checkup',
  VACCINATION = 'Vaccination',
  PRESCRIPTION_REFILL = 'Prescription Refill',
}

// Queue Status
export enum QueueStatus {
  WAITING = 'WAITING', // In queue
  IN_PROGRESS = 'IN_PROGRESS', // Currently being attended
  COMPLETED = 'COMPLETED', // Attended and discharged
  CANCELLED = 'CANCELLED', // Patient left or no-show
}

// Patient Interface
export interface Patient {
  id: string; // Unique identifier (e.g., "P001", "P002")
  firstName: string;
  lastName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  phoneNumber: string;
  email?: string;
  medicalCondition: MedicalConditions;
  symptoms: string; // Free text description
  vitalSigns?: VitalSigns;
  registrationDate: Date;
}

// Vital Signs (measured during triage)
export interface VitalSigns {
  bloodPressure: string;            // e.g., "120/80"
  heartRate: number;                // beats per minute
  temperature: number;              // Celsius
  oxygenSaturation: number;         // percentage (%)
}

/**
 * Queue Entry - Represents a patient in the queue
 */
export interface QueueEntry {
  id: string;                       // Unique queue entry ID
  patient: Patient;
  priority: PatientPriority;
  priorityScore: number;            // Calculated score for sorting
  queuePosition: number;            // Current position (1 = next to be served)
  arrivalTime: Date;                // When patient joined queue
  estimatedWaitTime: number;        // Minutes until patient is seen
  status: QueueStatus;
  assignedDoctor?: string;          // Doctor name/ID
  notes?: string;                   // Nurse/doctor notes
}

// Queue Statistic
export interface QueueStats {
    totalPatients: number;
    criticalCount: number;
    regularCount: number;
    delayedCount: number;
    averageWaitTime: number; //Minutes
    longestWaitTime: number; //Minutes
    patientsServedToday: number;
    totalInQueue: number;

}

export enum AppointmentType {
  CONSULTATION = 'CONSULTATION',
  FOLLOW_UP = 'FOLLOW_UP',
  SURGERY = 'SURGERY',
  LAB_TEST = 'LAB_TEST',
  VACCINATION = 'VACCINATON'
}

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW'
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  doctorName: string;
  appointmentType: AppointmentType;
  appointmentDate: Date;
  appointmentTime: string;
  duration: number; // in minutes
  status: AppointmentStatus;
  reason: string;
  notes?: string;
  createdAt: Date;
}

export interface AppointmentSlot {
  time: string;
  available: boolean;
  doctorName: string;
}
