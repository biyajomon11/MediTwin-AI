import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

import authRouter         from './routes/auth';
import observationsRouter from './routes/observations';
import patientsRouter     from './routes/patients';
import registerRouter     from './routes/register';
import doctorRouter       from './routes/doctor';

dotenv.config();

const app    = express();
const prisma = new PrismaClient();
const PORT   = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ── Route Mounts ────────────────────────────────────────────────
app.use('/api/auth',                  authRouter);
app.use('/api/register',              registerRouter);
app.use('/api/doctor',                doctorRouter);
app.use('/api/nurse/observations',    observationsRouter);
app.use('/api/nurse/patients',        patientsRouter);

// ── Health check ────────────────────────────────────────────────
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    res.json({
      status:        'ok',
      message:       'MediTwin AI Backend API is running!',
      timestamp:     new Date().toISOString(),
      normalization: '3NF (27 tables)',
    });
  } catch (error) {
    res.status(500).json({ status: 'error', error: (error as Error).message });
  }
});

// ── Schema summary ───────────────────────────────────────────────
app.get('/api/schema-summary', (_req: Request, res: Response) => {
  res.json({
    appName:     'MediTwin AI Database API',
    normalForm:  '3NF (Third Normal Form)',
    totalTables: 27,
    domains: [
      { name: 'Auth & Roles',               tables: ['roles', 'users'] },
      { name: 'Profiles & Lookups',         tables: ['genders', 'blood_groups', 'patients', 'doctors', 'nurses', 'admins'] },
      { name: 'Hospital & Departments',     tables: ['hospitals', 'specializations', 'departments'] },
      { name: 'Appointments',               tables: ['appointment_statuses', 'appointments'] },
      { name: 'Prescriptions & Medicines',  tables: ['medicines', 'prescriptions', 'prescription_items'] },
      { name: 'Medical Records & Documents',tables: ['record_types', 'medical_records', 'document_types', 'medical_documents'] },
      { name: 'Reminders & Notifications',  tables: ['reminder_statuses', 'medicine_reminders', 'notification_types', 'notifications'] },
      { name: 'Audit Logs',                 tables: ['action_types', 'audit_logs'] },
      { name: 'Nursing Observations',       tables: ['patient_observations'] },
    ],
  });
});

app.listen(PORT, () => {
  console.log(`🚀 MediTwin AI Backend API running on http://localhost:${PORT}`);
});
