import { Injectable } from '@angular/core';
import { AppointmentType } from '../models/patient.model';

export interface DoctorSchedule {
  name: string;
  specialization: string;
  workingDays: number[]; // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  startHour: number;
  endHour: number;
  avatar: string;
}

export interface TimeSlot {
  time: string;        // e.g. "09:00"
  available: boolean;
  doctorName: string;
  conflictReason?: string;
}

@Injectable({
  providedIn: 'root',
})
export class DoctorScheduleService {

  // Appointment durations in minutes per type
  readonly APPOINTMENT_DURATIONS: Record<string, number> = {
    [AppointmentType.CONSULTATION]: 30,
    [AppointmentType.FOLLOW_UP]: 20,
    [AppointmentType.SURGERY]: 120,
    [AppointmentType.LAB_TEST]: 45,
    [AppointmentType.VACCINATION]: 15,
  };

  // Hardcoded doctor schedules
  readonly DOCTORS: DoctorSchedule[] = [
    {
      name: 'Dr. Sarah Johnson',
      specialization: 'General Practitioner',
      workingDays: [1, 2, 3, 4, 5], // Mon–Fri
      startHour: 9,
      endHour: 16,
      avatar: '👩‍⚕️',
    },
    {
      name: 'Dr. Michael Brown',
      specialization: 'Surgeon',
      workingDays: [2, 3, 4, 5, 6], // Tue–Sat
      startHour: 10,
      endHour: 18,
      avatar: '👨‍⚕️',
    },
    {
      name: 'Dr. Emily Davis',
      specialization: 'Pediatrician',
      workingDays: [1, 2, 3, 4], // Mon–Thu
      startHour: 8,
      endHour: 15,
      avatar: '👩‍⚕️',
    },
    {
      name: 'Dr. David Wilson',
      specialization: 'Cardiologist',
      workingDays: [1, 2, 3, 4, 5], // Mon–Fri
      startHour: 11,
      endHour: 19,
      avatar: '👨‍⚕️',
    },
  ];

  // ─────────────────────────────────────────────
  // Get all doctors
  // ─────────────────────────────────────────────

  getDoctors(): DoctorSchedule[] {
    return this.DOCTORS;
  }

  getDoctorNames(): string[] {
    return this.DOCTORS.map((d) => d.name);
  }

  getDoctorByName(name: string): DoctorSchedule | undefined {
    return this.DOCTORS.find((d) => d.name === name);
  }

  // ─────────────────────────────────────────────
  // Check if doctor works on a given date
  // ─────────────────────────────────────────────

  isDoctorAvailableOnDate(doctorName: string, date: Date): boolean {
    const doctor = this.getDoctorByName(doctorName);
    if (!doctor) return false;
    const dayOfWeek = date.getDay();
    return doctor.workingDays.includes(dayOfWeek);
  }

  // ─────────────────────────────────────────────
  // Get working days label for display
  // ─────────────────────────────────────────────

  getWorkingDaysLabel(doctor: DoctorSchedule): string {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return doctor.workingDays.map((d) => dayNames[d]).join(', ');
  }

  // ─────────────────────────────────────────────
  // Get working hours label for display
  // ─────────────────────────────────────────────

  getWorkingHoursLabel(doctor: DoctorSchedule): string {
    const formatHour = (h: number) => {
      const suffix = h >= 12 ? 'PM' : 'AM';
      const hour = h > 12 ? h - 12 : h;
      return `${hour}:00 ${suffix}`;
    };
    return `${formatHour(doctor.startHour)} – ${formatHour(doctor.endHour)}`;
  }

  // ─────────────────────────────────────────────
  // Generate all possible slots for doctor on date
  // ─────────────────────────────────────────────

  generateSlots(
    doctor: DoctorSchedule,
    date: Date,
    appointmentType: string,
    bookedAppointments: { time: string; duration: number }[]
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const duration = this.APPOINTMENT_DURATIONS[appointmentType] || 30;
    const slotInterval = 30; // generate a slot every 30 minutes

    // Build blocked time ranges from existing appointments
    const blockedRanges = bookedAppointments.map((apt) => {
      const [h, m] = apt.time.split(':').map(Number);
      const startMinutes = h * 60 + m;
      return {
        start: startMinutes,
        end: startMinutes + apt.duration,
      };
    });

    // Generate slots from startHour to endHour
    for (
      let minutes = doctor.startHour * 60;
      minutes + duration <= doctor.endHour * 60;
      minutes += slotInterval
    ) {
      const slotEnd = minutes + duration;
      const timeLabel = this.minutesToTime(minutes);

      // Check if this slot conflicts with any booked range
      const conflict = blockedRanges.find(
        (range) => minutes < range.end && slotEnd > range.start
      );

      // Check if slot is in the past (for today)
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      const isPast =
        isToday && minutes <= now.getHours() * 60 + now.getMinutes();

      slots.push({
        time: timeLabel,
        available: !conflict && !isPast,
        doctorName: doctor.name,
        conflictReason: conflict
          ? 'Already booked'
          : isPast
          ? 'Time has passed'
          : undefined,
      });
    }

    return slots;
  }

  // ─────────────────────────────────────────────
  // Get duration for appointment type
  // ─────────────────────────────────────────────

  getDuration(appointmentType: string): number {
    return this.APPOINTMENT_DURATIONS[appointmentType] || 30;
  }

  // ─────────────────────────────────────────────
  // Format minutes to HH:MM string
  // ─────────────────────────────────────────────

  private minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  // ─────────────────────────────────────────────
  // Format time for display (e.g. "09:00" → "9:00 AM")
  // ─────────────────────────────────────────────

  formatTimeDisplay(time: string): string {
    const [h, m] = time.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
  }
}