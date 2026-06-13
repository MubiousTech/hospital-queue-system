import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ID, Query } from 'appwrite';
import { databases, DB_ID, COLLECTIONS } from './appwrite.config';
import { DoctorScheduleService } from './doctor-schedule.service';
import {
  Appointment,
  AppointmentType,
  AppointmentStatus,
} from '../models/patient.model';

@Injectable({
  providedIn: 'root',
})
export class AppointmentService {
  private appointmentsSubject: BehaviorSubject<Appointment[]>;
  public appointments$: Observable<Appointment[]>;

  constructor(private doctorSchedule: DoctorScheduleService) {
    this.appointmentsSubject = new BehaviorSubject<Appointment[]>([]);
    this.appointments$ = this.appointmentsSubject.asObservable();
    this.loadAppointments();
  }

  // ─────────────────────────────────────────────
  // LOAD FROM APPWRITE
  // ─────────────────────────────────────────────

  async loadAppointments(): Promise<void> {
    try {
      const result = await databases.listDocuments(
        DB_ID,
        COLLECTIONS.APPOINTMENTS,
        [Query.limit(100), Query.orderDesc('$createdAt')]
      );
      const appointments = result.documents.map((doc) =>
        this.documentToAppointment(doc)
      );
      this.appointmentsSubject.next(appointments);
    } catch (error) {
      console.error('Failed to load appointments:', error);
    }
  }

  getAppointments(): Appointment[] {
    return this.appointmentsSubject.value;
  }

  getAppointmentById(id: string): Appointment | undefined {
    return this.appointmentsSubject.value.find((a) => a.id === id);
  }

  getAvailableDoctors(): string[] {
    return this.doctorSchedule.getDoctorNames();
  }

  // ─────────────────────────────────────────────
  // GET AVAILABLE SLOTS — duration-aware
  // ─────────────────────────────────────────────

  getAvailableSlots(
    date: Date,
    doctorName: string,
    appointmentType: string
  ) {
    const doctor = this.doctorSchedule.getDoctorByName(doctorName);
    if (!doctor) return [];

    // Doctor not working this day
    if (!this.doctorSchedule.isDoctorAvailableOnDate(doctorName, date)) {
      return [];
    }

    // Get existing appointments for this doctor on this date
    const existing = this.appointmentsSubject.value.filter((apt) => {
      const aptDate = new Date(apt.appointmentDate).toDateString();
      return (
        apt.doctorName === doctorName &&
        aptDate === date.toDateString() &&
        apt.status !== AppointmentStatus.CANCELLED
      );
    });

    const bookedSlots = existing.map((apt) => ({
      time: apt.appointmentTime,
      duration: apt.duration,
    }));

    return this.doctorSchedule.generateSlots(
      doctor,
      date,
      appointmentType,
      bookedSlots
    );
  }

  // ─────────────────────────────────────────────
  // BOOK APPOINTMENT — with conflict check
  // ─────────────────────────────────────────────

  async bookAppointment(
    appointment: Omit<Appointment, 'id' | 'createdAt'>
  ): Promise<Appointment> {
    // Double-check conflict before saving
    const slots = this.getAvailableSlots(
      new Date(appointment.appointmentDate),
      appointment.doctorName,
      appointment.appointmentType
    );

    const selectedSlot = slots.find(
      (s) => s.time === appointment.appointmentTime
    );

    if (!selectedSlot) {
      throw new Error(
        `${appointment.doctorName} is not available on this date.`
      );
    }

    if (!selectedSlot.available) {
      throw new Error(
        `This doctor is already booked for the selected time. Please choose another slot.`
      );
    }

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
      const current = this.appointmentsSubject.value;
      this.appointmentsSubject.next([newAppointment, ...current]);

      return newAppointment;
    } catch (error: any) {
      throw error;
    }
  }

  // ─────────────────────────────────────────────
  // UPDATE / CANCEL / DELETE
  // ─────────────────────────────────────────────

  async updateAppointmentStatus(
    appointmentId: string,
    status: AppointmentStatus
  ): Promise<void> {
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
  }

  async cancelAppointment(appointmentId: string): Promise<void> {
    return this.updateAppointmentStatus(
      appointmentId,
      AppointmentStatus.CANCELLED
    );
  }

  async deleteAppointment(appointmentId: string): Promise<void> {
    await databases.deleteDocument(
      DB_ID,
      COLLECTIONS.APPOINTMENTS,
      appointmentId
    );
    const filtered = this.appointmentsSubject.value.filter(
      (apt) => apt.id !== appointmentId
    );
    this.appointmentsSubject.next(filtered);
  }

  // ─────────────────────────────────────────────
  // DOCUMENT CONVERTER
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