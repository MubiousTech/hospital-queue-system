// User interface - defines the structure of user data

export interface User {
  id?: number; //Optional: auto-generated
  email: string;
  password: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  createdAt?: Date;
}

//User role enum - restricts role values to specific options
export enum UserRole {
    ADMIN = 'admin',
    DOCTOR = 'doctor',
    NURSE = 'nurse',
    PATIENT = 'patient'
}

//Login request interface - data sent to backend
export interface LoginRequest {
    email: string;
    password: string;
    role: string;
}

//Login response interface - data received from backend
export interface LoginResponse {
    success: boolean;
    token?: string;     //JWT token for authentication
    user?: User;
    message?: string;
}