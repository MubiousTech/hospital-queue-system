export interface User {
  id?: string;        // Appwrite uses string IDs
  email: string;
  password?: string;  // Optional — never stored after login
  role: UserRole;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  createdAt?: Date;
}

export enum UserRole {
  ADMIN = 'admin',
  DOCTOR = 'doctor',
  NURSE = 'nurse',
  RECORD_OFFICER = 'record-officer',
  PATIENT = 'patient'
}

export interface LoginRequest {
  email: string;
  password: string;
  role: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: User;
  message?: string;
}