import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ID, Query } from 'appwrite';
import { databases, DB_ID, COLLECTIONS } from './appwrite.config';
import {
  Appointment,
  AppointmentType,
  AppointmentStatus,
  AppointmentSlot,
} from '../models/patient.model';

@Injectable({
  providedIn: 'root',
})
export class AppointmentService {
  private appointmentsSubject: BehaviorSubject<Appointment[]>;
  public appointments$: Observable<Appointment[]>;

  private availableDoctors = [
    'Dr. Sarah Johnson',
    'Dr. Michael Brown',
    'Dr. Emily Davis',
    'Dr. David Wilson',
  ];

  constructor() {
    this.appointmentsSubject = new BehaviorSubject<Appointment[]>([]);
    this.appointments$ = this.appointmentsSubject.asObservable();
    this.loadAppointments();
  }

  // ─────────────────────────────────────────────
  // LOAD APPOINTMENTS FROM APPWRITE
  // ─────────────────────────────────────────────

  async loadAppointments(): Promise<void> {
    try {
      const result = await databases.listDocuments(
        DB_ID,
        COLLECTIONS.APPOINTMENTS,
        [Query.limit(100), Query.orderDesc('$createdAt')]
      );

      const appointments: Appointment[] = result.documents.map((doc) =>
        this.documentToAppointment(doc)
      );

      this.appointmentsSubject.next(appointments);
      console.log(`✅ Appointments loaded: ${appointments.length}`);
    } catch (error) {
      console.error('Failed to load appointments:', error);
    }
  }

  getAppointments(): Appointment[] {
    return this.appointmentsSubject.value;
  }

  getAppointmentById(id: string): Appointment | undefined {
    return this.appointmentsSubject.value.find((apt) => apt.id === id);
  }

  getAppointmentsByDate(date: Date): Appointment[] {
    return this.appointmentsSubject.value.filter((apt) => {
      const aptDate = new Date(apt.appointmentDate);
      return aptDate.toDateString() === date.toDateString();
    });
  }

  getAvailableDoctors(): string[] {
    return this.availableDoctors;
  }

  getAvailableSlots(date: Date, doctorName: string): AppointmentSlot[] {
    const workingHours = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    ];

    const bookedSlots = this.getAppointmentsByDate(date)
      .filter((apt) => apt.doctorName === doctorName)
      .map((apt) => apt.appointmentTime);

    return workingHours.map((time) => ({
      time,
      available: !bookedSlots.includes(time),
      doctorName,
    }));
  }

  // ─────────────────────────────────────────────
  // BOOK APPOINTMENT
  // ─────────────────────────────────────────────

  async bookAppointment(
    appointment: Omit<Appointment, 'id' | 'createdAt'>
  ): Promise<Appointment> {
    try {
      const doc = await databases.createDocument(
        DB_ID,
        COLLECTIONS.APPOINTMENTS,
        ID.unique(),
        {
          patientId: appointment.patientId,
          patientName: appointment.patientName,
          patientEmail: appointment.patientEmail,
          patientPhone: appointment.patientPhone,
          doctorName: appointment.doctorName,
          appointmentType: appointment.appointmentType,
          appointmentDate: new Date(appointment.appointmentDate).toISOString(),
          appointmentTime: appointment.appointmentTime,
          duration: appointment.duration,
          status: appointment.status,
          reason: appointment.reason,
          notes: appointment.notes || null,
          createdAt: new Date().toISOString(),
        }
      );

      const newAppointment = this.documentToAppointment(doc);

      // Update local state
      const current = this.appointmentsSubject.value;
      this.appointmentsSubject.next([newAppointment, ...current]);

      console.log(`✅ Appointment booked: ${doc.$id}`);
      return newAppointment;
    } catch (error) {
      console.error('Failed to book appointment:', error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────
  // UPDATE STATUS
  // ─────────────────────────────────────────────

  async updateAppointmentStatus(
    appointmentId: string,
    status: AppointmentStatus
  ): Promise<void> {
    try {
      await databases.updateDocument(
        DB_ID,
        COLLECTIONS.APPOINTMENTS,
        appointmentId,
        { status }
      );

      const updated = this.appointmentsSubject.value.map((apt) =>
        apt.id === appointmentId ? { ...apt, status } : apt
      );
      this.appointmentsSubject.next(updated);
    } catch (error) {
      console.error('Failed to update appointment status:', error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────
  // CANCEL APPOINTMENT
  // ─────────────────────────────────────────────

  async cancelAppointment(appointmentId: string): Promise<void> {
    return this.updateAppointmentStatus(appointmentId, AppointmentStatus.CANCELLED);
  }

  // ─────────────────────────────────────────────
  // DELETE APPOINTMENT
  // ─────────────────────────────────────────────

  async deleteAppointment(appointmentId: string): Promise<void> {
    try {
      await databases.deleteDocument(
        DB_ID,
        COLLECTIONS.APPOINTMENTS,
        appointmentId
      );

      const filtered = this.appointmentsSubject.value.filter(
        (apt) => apt.id !== appointmentId
      );
      this.appointmentsSubject.next(filtered);
    } catch (error) {
      console.error('Failed to delete appointment:', error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────
  // CONVERT APPWRITE DOCUMENT TO APPOINTMENT
  // ─────────────────────────────────────────────

  private documentToAppointment(doc: any): Appointment {
    return {
      id: doc.$id,
      patientId: doc['patientId'],
      patientName: doc['patientName'],
      patientEmail: doc['patientEmail'],
      patientPhone: doc['patientPhone'],
      doctorName: doc['doctorName'],
      appointmentType: doc['appointmentType'] as AppointmentType,
      appointmentDate: new Date(doc['appointmentDate']),
      appointmentTime: doc['appointmentTime'],
      duration: doc['duration'],
      status: doc['status'] as AppointmentStatus,
      reason: doc['reason'],
      notes: doc['notes'] || undefined,
      createdAt: new Date(doc['createdAt']),
    };
  }
}