import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Appointment, AppointmentType, AppointmentStatus, AppointmentSlot } from '../models/patient.model';

@Injectable({
  providedIn: 'root',
})
export class AppointmentService {
  private appointmentsSubject: BehaviorSubject<Appointment[]>;
  public appointments$: Observable<Appointment[]>;

   // Mock appointments data
  private mockAppointments: Appointment[] = [
    {
      id: '1',
      patientId: '101',
      patientName: 'John Doe',
      patientEmail: 'john@example.com',
      patientPhone: '08012345678',
      doctorName: 'Dr. Sarah Johnson',
      appointmentType: AppointmentType.CONSULTATION,
      appointmentDate: new Date('2024-05-15'),
      appointmentTime: '10:00',
      duration: 30,
      status: AppointmentStatus.SCHEDULED,
      reason: 'General checkup',
      createdAt: new Date()
    },
    {
      id: '2',
      patientId: '102',
      patientName: 'Jane Smith',
      patientEmail: 'jane@example.com',
      patientPhone: '08087654321',
      doctorName: 'Dr. Michael Brown',
      appointmentType: AppointmentType.FOLLOW_UP,
      appointmentDate: new Date('2024-05-16'),
      appointmentTime: '14:00',
      duration: 20,
      status: AppointmentStatus.CONFIRMED,
      reason: 'Follow-up after surgery',
      createdAt: new Date()
    }
  ];

  private availableDoctors = [
    'Dr. Sarah Johnson',
    'Dr. Michael Brown',
    'Dr. Emily Davis',
    'Dr. David Wilson'
  ];

    constructor() {
    this.appointmentsSubject = new BehaviorSubject<Appointment[]>(this.mockAppointments);
    this.appointments$ = this.appointmentsSubject.asObservable();
  }

  getAppointments(): Appointment[] {
    return this.appointmentsSubject.value;
  }

  getAppointmentById(id: string): Appointment | undefined {
    return this.appointmentsSubject.value.find(apt => apt.id === id);
  }

   getAppointmentsByDate(date: Date): Appointment[] {
    return this.appointmentsSubject.value.filter(apt => {
      const aptDate = new Date(apt.appointmentDate);
      return aptDate.toDateString() === date.toDateString();
    });
  }

  getAvailableDoctors(): string[] {
    return this.availableDoctors;
  }

   getAvailableSlots(date: Date, doctorName: string): AppointmentSlot[] {
    const slots: AppointmentSlot[] = [];
    const workingHours = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
                          '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'];

    const bookedSlots = this.getAppointmentsByDate(date)
      .filter(apt => apt.doctorName === doctorName)
      .map(apt => apt.appointmentTime);

    workingHours.forEach(time => {
      slots.push({
        time: time,
        available: !bookedSlots.includes(time),
        doctorName: doctorName
      });
    });

    return slots;
  }

   bookAppointment(appointment: Omit<Appointment, 'id' | 'createdAt'>): Appointment {
    const newAppointment: Appointment = {
      ...appointment,
      id: this.generateId(),
      createdAt: new Date()
    };

    const currentAppointments = this.appointmentsSubject.value;
    this.appointmentsSubject.next([...currentAppointments, newAppointment]);

    return newAppointment;
  }

  updateAppointmentStatus(appointmentId: string, status: AppointmentStatus): void {
    const appointments = this.appointmentsSubject.value.map(apt => 
      apt.id === appointmentId ? { ...apt, status } : apt
    );
    this.appointmentsSubject.next(appointments);
  }

  cancelAppointment(appointmentId: string): void {
    this.updateAppointmentStatus(appointmentId, AppointmentStatus.CANCELLED);
  }

  deleteAppointment(appointmentId: string): void {
    const appointments = this.appointmentsSubject.value.filter(apt => apt.id !== appointmentId);
    this.appointmentsSubject.next(appointments);
  }

  private generateId(): string {
    return 'APT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }
}
