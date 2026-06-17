import { Injectable } from '@angular/core';
import { ID, Query } from 'appwrite';
import { databases, DB_ID, COLLECTIONS } from './appwrite.config';
import {
  Patient,
  MedicalRecord,
  MaritalStatus,
  BloodGroup,
  Genotype,
} from '../models/patient.model';

@Injectable({
  providedIn: 'root',
})
export class PatientServiceTs {
  // ─────────────────────────────────────────────
  // CREATE PATIENT — Record Officer only, runs once per person
  // ─────────────────────────────────────────────

  async createPatient(
    data: Omit<Patient, 'id' | 'patientNumber' | 'registrationDate'>,
  ): Promise<Patient> {
    const patientNumber = await this.generatePatientNumber();

    const doc = await databases.createDocument(DB_ID, COLLECTIONS.PATIENTS, ID.unique(), {
      patientNumber,
      firstName: data.firstName,
      lastName: data.lastName,
      age: data.age,
      gender: data.gender,
      phoneNumber: data.phoneNumber,
      email: data.email || null,
      address: data.address || null,
      occupation: data.occupation || null,
      maritalStatus: data.maritalStatus || null,
      nextOfKin: data.nextOfKin || null,
      nextOfKinPhone: data.nextOfKinPhone || null,
      emergencyContact: data.emergencyContact || null,
      bloodGroup: data.bloodGroup || null,
      genotype: data.genotype || null,
      allergies: data.allergies || null,
      chronicConditions: data.chronicConditions || null,
      registrationDate: new Date().toISOString(),
    });

    return this.documentToPatient(doc);
  }

  // ─────────────────────────────────────────────
  // UPDATE PATIENT
  // ─────────────────────────────────────────────

  async updatePatient(id: string, data: Partial<Patient>): Promise<Patient> {
    const updateData: any = {};

    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.age !== undefined) updateData.age = data.age;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber;
    if (data.email !== undefined) updateData.email = data.email || null;
    if (data.address !== undefined) updateData.address = data.address || null;
    if (data.occupation !== undefined) updateData.occupation = data.occupation || null;
    if (data.maritalStatus !== undefined) updateData.maritalStatus = data.maritalStatus || null;
    if (data.nextOfKin !== undefined) updateData.nextOfKin = data.nextOfKin || null;
    if (data.nextOfKinPhone !== undefined) updateData.nextOfKinPhone = data.nextOfKinPhone || null;
    if (data.emergencyContact !== undefined)
      updateData.emergencyContact = data.emergencyContact || null;
    if (data.bloodGroup !== undefined) updateData.bloodGroup = data.bloodGroup || null;
    if (data.genotype !== undefined) updateData.genotype = data.genotype || null;
    if (data.allergies !== undefined) updateData.allergies = data.allergies || null;
    if (data.chronicConditions !== undefined)
      updateData.chronicConditions = data.chronicConditions || null;

    const doc = await databases.updateDocument(DB_ID, COLLECTIONS.PATIENTS, id, updateData);
    return this.documentToPatient(doc);
  }

  // ─────────────────────────────────────────────
  // DELETE PATIENT
  // ─────────────────────────────────────────────

  async deletePatient(id: string): Promise<void> {
    await databases.deleteDocument(DB_ID, COLLECTIONS.PATIENTS, id);
  }

  // ─────────────────────────────────────────────
  // GET SINGLE PATIENT
  // ─────────────────────────────────────────────

  async getPatientById(id: string): Promise<Patient> {
    const doc = await databases.getDocument(DB_ID, COLLECTIONS.PATIENTS, id);
    return this.documentToPatient(doc);
  }

  // ─────────────────────────────────────────────
  // GET ALL PATIENTS
  // ─────────────────────────────────────────────

  async getAllPatients(): Promise<Patient[]> {
    const result = await databases.listDocuments(DB_ID, COLLECTIONS.PATIENTS, [
      Query.limit(200),
      Query.orderDesc('$createdAt'),
    ]);
    return result.documents.map((doc) => this.documentToPatient(doc));
  }

  // ─────────────────────────────────────────────
  // SEARCH PATIENTS — by name or phone number
  // ─────────────────────────────────────────────

  async searchPatients(term: string): Promise<Patient[]> {
    if (!term.trim()) return this.getAllPatients();

    const all = await this.getAllPatients();
    const lower = term.toLowerCase();

    return all.filter((p) => {
      const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
      const phone = p.phoneNumber || '';
      const number = p.patientNumber || '';

      return (
        fullName.includes(lower) || phone.includes(term) || number.toLowerCase().includes(lower)
      );
    });
  }

  // ─────────────────────────────────────────────
  // PATIENT HISTORY — all medical records for a patient, newest first
  // ─────────────────────────────────────────────

  async getPatientHistory(patientId: string): Promise<MedicalRecord[]> {
    const result = await databases.listDocuments(DB_ID, COLLECTIONS.MEDICAL_RECORDS, [
      Query.equal('patientId', patientId),
      Query.orderDesc('visitDate'),
      Query.limit(100),
    ]);
    return result.documents.map((doc) => this.documentToMedicalRecord(doc));
  }

  // ─────────────────────────────────────────────
  // GET SINGLE MEDICAL RECORD
  // ─────────────────────────────────────────────

  async getPatientMedicalRecord(recordId: string): Promise<MedicalRecord> {
    const doc = await databases.getDocument(DB_ID, COLLECTIONS.MEDICAL_RECORDS, recordId);
    return this.documentToMedicalRecord(doc);
  }

  // ─────────────────────────────────────────────
  // CREATE a new medical record for a visit (called when nurse starts triage)
  // ─────────────────────────────────────────────

  async createMedicalRecord(
    data: Omit<MedicalRecord, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<MedicalRecord> {
    const now = new Date().toISOString();

    const doc = await databases.createDocument(DB_ID, COLLECTIONS.MEDICAL_RECORDS, ID.unique(), {
      patientId: data.patientId,
      visitDate: new Date(data.visitDate).toISOString(),
      medicalCondition: data.medicalCondition || null,
      symptoms: data.symptoms || null,
      bloodPressure: data.vitalSigns?.bloodPressure || null,
      heartRate: data.vitalSigns?.heartRate || null,
      temperature: data.vitalSigns?.temperature || null,
      oxygenSaturation: data.vitalSigns?.oxygenSaturation || null,
      nurseNotes: data.nurseNotes || null,
      priority: data.priority || null,
      diagnosis: data.diagnosis || null,
      treatment: data.treatment || null,
      medications: data.medications || null,
      doctorNotes: data.doctorNotes || null,
      followUpDate: data.followUpDate ? new Date(data.followUpDate).toISOString() : null,
      assignedDoctor: data.assignedDoctor || null,
      createdAt: now,
      updatedAt: now,
    });

    return this.documentToMedicalRecord(doc);
  }

  // ─────────────────────────────────────────────
  // UPDATE MEDICAL RECORD — used by Doctor to add diagnosis/treatment/etc.
  // ─────────────────────────────────────────────

  async updateMedicalRecord(id: string, data: Partial<MedicalRecord>): Promise<MedicalRecord> {
    const updateData: any = { updatedAt: new Date().toISOString() };

    if (data.diagnosis !== undefined) updateData.diagnosis = data.diagnosis || null;
    if (data.treatment !== undefined) updateData.treatment = data.treatment || null;
    if (data.medications !== undefined) updateData.medications = data.medications || null;
    if (data.doctorNotes !== undefined) updateData.doctorNotes = data.doctorNotes || null;
    if (data.nurseNotes !== undefined) updateData.nurseNotes = data.nurseNotes || null;
    if (data.followUpDate !== undefined)
      updateData.followUpDate = data.followUpDate
        ? new Date(data.followUpDate).toISOString()
        : null;
    if (data.assignedDoctor !== undefined) updateData.assignedDoctor = data.assignedDoctor || null;
    if (data.vitalSigns !== undefined) {
      updateData.bloodPressure = data.vitalSigns?.bloodPressure || null;
      updateData.heartRate = data.vitalSigns?.heartRate || null;
      updateData.temperature = data.vitalSigns?.temperature || null;
      updateData.oxygenSaturation = data.vitalSigns?.oxygenSaturation || null;
    }

    const doc = await databases.updateDocument(DB_ID, COLLECTIONS.MEDICAL_RECORDS, id, updateData);
    return this.documentToMedicalRecord(doc);
  }

  // ─────────────────────────────────────────────
  // AUTO-GENERATE PATIENT NUMBER — e.g. P-0001, P-0002...
  // ─────────────────────────────────────────────

  private async generatePatientNumber(): Promise<string> {
    const result = await databases.listDocuments(DB_ID, COLLECTIONS.PATIENTS, [
      Query.limit(100),
      Query.orderDesc('$createdAt'),
    ]);

    // Find the highest existing patientNumber among documents that actually have one
    let highest = 0;

    for (const doc of result.documents) {
      const lastNumber = doc['patientNumber'] as string | undefined;
      if (!lastNumber || typeof lastNumber !== 'string' || !lastNumber.includes('-')) {
        continue; // skip old/legacy documents without a valid patientNumber
      }
      const numericPart = parseInt(lastNumber.split('-')[1], 10);
      if (!isNaN(numericPart) && numericPart > highest) {
        highest = numericPart;
      }
    }

    const nextNumber = highest + 1;
    return `P-${String(nextNumber).padStart(4, '0')}`;
  }

  // ─────────────────────────────────────────────
  // DOCUMENT CONVERTERS
  // ─────────────────────────────────────────────

  private documentToPatient(doc: any): Patient {
    return {
      id: doc.$id,
      patientNumber: doc['patientNumber'],
      firstName: doc['firstName'],
      lastName: doc['lastName'],
      age: doc['age'],
      gender: doc['gender'],
      phoneNumber: doc['phoneNumber'],
      email: doc['email'] || undefined,
      address: doc['address'] || undefined,
      occupation: doc['occupation'] || undefined,
      maritalStatus: (doc['maritalStatus'] as MaritalStatus) || undefined,
      nextOfKin: doc['nextOfKin'] || undefined,
      nextOfKinPhone: doc['nextOfKinPhone'] || undefined,
      emergencyContact: doc['emergencyContact'] || undefined,
      bloodGroup: (doc['bloodGroup'] as BloodGroup) || undefined,
      genotype: (doc['genotype'] as Genotype) || undefined,
      allergies: doc['allergies'] || undefined,
      chronicConditions: doc['chronicConditions'] || undefined,
      registrationDate: new Date(doc['registrationDate']),
    };
  }

  private documentToMedicalRecord(doc: any): MedicalRecord {
    return {
      id: doc.$id,
      patientId: doc['patientId'],
      visitDate: new Date(doc['visitDate']),
      medicalCondition: doc['medicalCondition'] || undefined,
      symptoms: doc['symptoms'] || undefined,
      vitalSigns: doc['bloodPressure']
        ? {
            bloodPressure: doc['bloodPressure'],
            heartRate: doc['heartRate'],
            temperature: doc['temperature'],
            oxygenSaturation: doc['oxygenSaturation'],
          }
        : undefined,
      nurseNotes: doc['nurseNotes'] || undefined,
      priority: doc['priority'] || undefined,
      diagnosis: doc['diagnosis'] || undefined,
      treatment: doc['treatment'] || undefined,
      medications: doc['medications'] || undefined,
      doctorNotes: doc['doctorNotes'] || undefined,
      followUpDate: doc['followUpDate'] ? new Date(doc['followUpDate']) : undefined,
      assignedDoctor: doc['assignedDoctor'] || undefined,
      createdAt: new Date(doc['createdAt']),
      updatedAt: new Date(doc['updatedAt']),
    };
  }
}
