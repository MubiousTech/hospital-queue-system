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
  WAITING = 'WAITING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

// ─────────────────────────────────────────────
// PATIENT — now a permanent record, not a queue-only object
// ─────────────────────────────────────────────

export enum MaritalStatus {
  SINGLE = 'Single',
  MARRIED = 'Married',
  DIVORCED = 'Divorced',
  WIDOWED = 'Widowed',
}

export enum BloodGroup {
  A_POSITIVE = 'A+',
  A_NEGATIVE = 'A-',
  B_POSITIVE = 'B+',
  B_NEGATIVE = 'B-',
  AB_POSITIVE = 'AB+',
  AB_NEGATIVE = 'AB-',
  O_POSITIVE = 'O+',
  O_NEGATIVE = 'O-',
  UNKNOWN = 'Unknown',
}

export enum Genotype {
  AA = 'AA',
  AS = 'AS',
  SS = 'SS',
  AC = 'AC',
  SC = 'SC',
  UNKNOWN = 'Unknown',
}

// Patient Interface — registered ONCE by Record Officer, reused across visits
export interface Patient {
  id: string;                  // Appwrite document ID
  patientNumber: string;       // Auto-generated, e.g. "P-0001" — human-friendly permanent ID
  firstName: string;
  lastName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  phoneNumber: string;
  email?: string;

  // Demographic / biodata fields (Record Officer collects these)
  address?: string;
  occupation?: string;
  maritalStatus?: MaritalStatus;
  nextOfKin?: string;
  nextOfKinPhone?: string;
  emergencyContact?: string;

  // Clinical baseline (rarely changes visit to visit)
  bloodGroup?: BloodGroup;
  genotype?: Genotype;
  allergies?: string;           // free text, e.g. "Penicillin, Peanuts"
  chronicConditions?: string;   // free text, e.g. "Hypertension, Diabetes"

  registrationDate: Date;       // first-ever registration date
}

// Vital Signs (measured during triage, per-visit)
export interface VitalSigns {
  bloodPressure: string;
  heartRate: number;
  temperature: number;
  oxygenSaturation: number;
}

// ─────────────────────────────────────────────
// MEDICAL RECORD — one per visit, accumulates over time per patient
// ─────────────────────────────────────────────

export interface MedicalRecord {
  id: string;
  patientId: string;            // links back to Patient.id
  visitDate: Date;

  // Triage-stage info (filled by Nurse)
  medicalCondition?: MedicalConditions;
  symptoms?: string;
  vitalSigns?: VitalSigns;
  nurseNotes?: string;
  priority?: PatientPriority;

  // Consultation-stage info (filled by Doctor)
  diagnosis?: string;
  treatment?: string;
  medications?: string;
  doctorNotes?: string;
  followUpDate?: Date;

  assignedDoctor?: string;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Queue Entry — references an EXISTING patient record, never creates one
 */
export interface QueueEntry {
  id: string;
  patientId: string;            // reference to Patient.id
  patient: Patient;             // hydrated patient object for display
  medicalRecordId?: string;     // links to the MedicalRecord created for this visit
  priority: PatientPriority;
  priorityScore: number;
  queuePosition: number;
  arrivalTime: Date;
  estimatedWaitTime: number;
  status: QueueStatus;
  assignedDoctor?: string;
  notes?: string;
}

// Queue Statistics
export interface QueueStats {
  totalPatients: number;
  criticalCount: number;
  regularCount: number;
  delayedCount: number;
  averageWaitTime: number;
  longestWaitTime: number;
  patientsServedToday: number;
  totalInQueue: number;
}

// ─────────────────────────────────────────────
// APPOINTMENTS (unchanged — preserved as-is)
// ─────────────────────────────────────────────

export enum AppointmentType {
  CONSULTATION = 'CONSULTATION',
  FOLLOW_UP = 'FOLLOW_UP',
  SURGERY = 'SURGERY',
  LAB_TEST = 'LAB_TEST',
  VACCINATION = 'VACCINATON',
}

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
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
  duration: number;
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