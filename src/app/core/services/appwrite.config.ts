import { Client, Account, Databases } from 'appwrite';

const client = new Client();

client
  .setEndpoint('https://cloud.appwrite.io/v1')
  .setProject('6a2a898d003d98ac746a');

export const account = new Account(client);
export const databases = new Databases(client);

// IDs — centralized so you only change them in one place
export const DB_ID = '6a2a8d910034a89d0082';

export const COLLECTIONS = {
  PATIENTS: 'patients',
  QUEUE_ENTRIES: 'queue_entries',
  APPOINTMENTS: 'appointments',
  USERS: 'users',
   MEDICAL_RECORDS: 'medical_records',
};