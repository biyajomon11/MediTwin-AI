import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// Shared helper: hash password
// ─────────────────────────────────────────────────────────────────────────────
const hashPassword = (plain: string) => bcrypt.hash(plain, 12);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/register/patient
// ─────────────────────────────────────────────────────────────────────────────
const patientSchema = z.object({
  firstName:             z.string().min(1),
  lastName:              z.string().min(1),
  email:                 z.string().email(),
  password:              z.string().min(8),
  dob:                   z.string().min(1),
  gender:                z.string().optional(),
  phone:                 z.string().optional(),
  address:               z.string().optional(),
  bloodGroup:            z.string().optional(),
  emergencyContactName:  z.string().optional(),
  emergencyRelationship: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  allergies:             z.string().optional(),
  medicalConditions:     z.string().optional(),
  medications:           z.string().optional(),
  primaryProvider:       z.string().optional(),
});

router.post('/patient', async (req: Request, res: Response) => {
  try {
    const parsed = patientSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.flatten().fieldErrors });
    }

    const d = parsed.data;

    // Lookup FK IDs
    let patientRole = await prisma.role.findFirst({ where: { name: 'patient' } });
    if (!patientRole) {
      patientRole = await prisma.role.create({ data: { name: 'patient' } });
    }

    const [genderRow, bloodGroupRow] = await Promise.all([
      d.gender ? prisma.gender.findFirst({ where: { name: { equals: d.gender, mode: 'insensitive' } } }) : null,
      d.bloodGroup ? prisma.bloodGroup.findFirst({ where: { name: { equals: d.bloodGroup, mode: 'insensitive' } } }) : null,
    ]);

    // Check email uniqueness
    const existing = await prisma.user.findUnique({ where: { email: d.email } });
    if (existing) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists.' });
    }

    // Resolve assigned primary doctor
    let doctor = null;
    if (d.primaryProvider) {
      const provName = d.primaryProvider.replace(/^Dr\.\s*/i, '').trim();
      doctor = await prisma.doctor.findFirst({
        where: {
          OR: [
            { firstName: { contains: provName, mode: 'insensitive' } },
            { lastName: { contains: provName, mode: 'insensitive' } },
          ],
        },
      });
    }
    if (!doctor) {
      doctor = await prisma.doctor.findFirst({
        where: { user: { isActive: true } },
      }) || await prisma.doctor.findFirst();
    }

    const password_hash = await hashPassword(d.password);

    const { user, patient } = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: d.email,
          password_hash,
          roleId: patientRole.id,
        },
      });

      const newPatient = await tx.patient.create({
        data: {
          userId:               newUser.id,
          firstName:            d.firstName,
          lastName:             d.lastName,
          dateOfBirth:          new Date(d.dob),
          genderId:             genderRow?.id ?? null,
          bloodGroupId:         bloodGroupRow?.id ?? null,
          phone:                d.phone ?? null,
          address:              d.address ?? null,
          emergencyContactName: d.emergencyContactName ?? null,
          emergencyContactPhone:d.emergencyContactPhone ?? null,
        },
      });

      // Record types for diagnosis & consultation
      const diagnosisType = await tx.recordType.findFirst({ where: { name: 'diagnosis' } }) || await tx.recordType.findFirst();
      const consultationType = await tx.recordType.findFirst({ where: { name: 'consultation' } }) || diagnosisType;

      // Seed medical conditions as medical records
      if (d.medicalConditions && doctor && diagnosisType) {
        const conditions = d.medicalConditions.split(/[,;\n]+/).map((c) => c.trim()).filter(Boolean);
        for (const cond of conditions) {
          await tx.medicalRecord.create({
            data: {
              patientId: newPatient.id,
              doctorId: doctor.id,
              recordTypeId: diagnosisType.id,
              title: cond,
              description: `Documented medical condition reported during patient registration: ${cond}.`,
              recordDate: new Date(),
            },
          });
        }
      }

      // Seed allergies as medical records
      if (d.allergies && doctor && consultationType) {
        const allergiesList = d.allergies.split(/[,;\n]+/).map((a) => a.trim()).filter(Boolean);
        for (const allergy of allergiesList) {
          await tx.medicalRecord.create({
            data: {
              patientId: newPatient.id,
              doctorId: doctor.id,
              recordTypeId: consultationType.id,
              title: `Allergy: ${allergy}`,
              description: `Documented patient allergy: ${allergy} (Reported during patient registration).`,
              recordDate: new Date(),
            },
          });
        }
      }

      // Seed medications as prescriptions & prescription items
      if (d.medications && doctor) {
        const medsList = d.medications.split(/[,;\n]+/).map((m) => m.trim()).filter(Boolean);
        if (medsList.length > 0) {
          const rx = await tx.prescription.create({
            data: {
              patientId: newPatient.id,
              doctorId: doctor.id,
              prescribedDate: new Date(),
              validUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
              diagnosis: d.medicalConditions || 'Routine Medication Regimen',
              notes: 'Prescriptions confirmed during patient onboarding.',
            },
          });

          for (const medStr of medsList) {
            const dosageMatch = medStr.match(/\b\d+\s*(?:mg|mcg|ml|g|tablets?|capsules?)\b/i);
            const dosage = dosageMatch ? dosageMatch[0] : '10 mg';

            let medName = medStr
              .replace(/\b\d+\s*(?:mg|mcg|ml|g|tablets?|capsules?)\b/gi, '')
              .replace(/\b(?:daily|once|twice|thrice|morning|night|bedtime|every|hours?|hrs?|day|days)\b/gi, '')
              .trim();
            if (!medName) medName = medStr;

            let med = await tx.medicine.findFirst({
              where: { name: { contains: medName, mode: 'insensitive' } },
            });
            if (!med) {
              med = await tx.medicine.create({
                data: {
                  name: medName,
                  category: 'Prescribed',
                },
              });
            }

            const item = await tx.prescriptionItem.create({
              data: {
                prescriptionId: rx.id,
                medicineId: med.id,
                dosage,
                frequency: /twice/i.test(medStr) ? 'Twice daily' : /thrice/i.test(medStr) ? 'Three times daily' : 'Once daily',
                durationDays: 30,
                instructions: 'Take orally with water after meals as directed.',
              },
            });

            // Auto-create medicine reminder
            const activeStatus = await tx.reminderStatus.findFirst({ where: { name: 'active' } });
            const reminderTime = new Date();
            reminderTime.setHours(8, 0, 0, 0);

            await tx.medicineReminder.create({
              data: {
                patientId: newPatient.id,
                medicineId: med.id,
                prescriptionItemId: item.id,
                reminderTime,
                frequency: 'Daily',
                startDate: new Date(),
                statusId: activeStatus?.id || 1,
              },
            });
          }
        }
      }

      return { user: newUser, patient: newPatient };
    });

    return res.status(201).json({
      success: true,
      message: 'Patient account created successfully.',
      userId: user.id,
      patientId: patient.id,
    });
  } catch (err) {
    console.error('[REGISTER] Patient error:', err);
    return res.status(500).json({ success: false, error: 'Registration failed. Please try again.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/register/nurse
// ─────────────────────────────────────────────────────────────────────────────
const nurseSchema = z.object({
  firstName:          z.string().min(1, 'First name is required.'),
  lastName:           z.string().min(1, 'Last name is required.'),
  email:              z.string().email('Invalid email address.'),
  password:           z.string().min(8, 'Password must be at least 8 characters.'),
  phone:              z.string().optional(),
  registrationNumber: z.string().optional(),
  nursingRegNo:       z.string().optional(),
  nurseId:            z.string().optional(),
  licenseNumber:      z.string().optional(),
  department:         z.string().optional(),
  assignedWard:       z.string().optional(),
});

router.post('/nurse', async (req: Request, res: Response) => {
  try {
    const parsed = nurseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.flatten().fieldErrors });
    }

    const d = parsed.data;
    const regNo = (d.registrationNumber || d.nursingRegNo || '').trim();

    if (!regNo) {
      return res.status(400).json({
        success: false,
        error: 'Nursing registration number is required.',
        errors: { registrationNumber: ['Nursing registration number is required.'] },
      });
    }

    const [nurseRole, departmentRow] = await Promise.all([
      prisma.role.findFirst({ where: { name: 'nurse' } }),
      d.department ? prisma.department.findFirst({ where: { name: { contains: d.department, mode: 'insensitive' } } }) : null,
    ]);

    if (!nurseRole) {
      return res.status(500).json({ success: false, error: 'Nurse role not found in database.' });
    }

    // 1. Check unique email
    const existing = await prisma.user.findUnique({ where: { email: d.email } });
    if (existing) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists.' });
    }

    // 2. Check unique registration number
    const existingReg = await prisma.nurse.findFirst({
      where: {
        OR: [
          { registrationNumber: { equals: regNo, mode: 'insensitive' } },
          { licenseNumber: { equals: regNo, mode: 'insensitive' } },
        ],
      },
    });
    if (existingReg) {
      return res.status(409).json({
        success: false,
        error: `A nurse with registration number '${regNo}' already exists.`,
      });
    }

    // 3. Check unique license number (if provided)
    if (d.licenseNumber && d.licenseNumber.trim()) {
      const cleanLicense = d.licenseNumber.trim();
      const existingLicense = await prisma.nurse.findFirst({
        where: {
          OR: [
            { licenseNumber: { equals: cleanLicense, mode: 'insensitive' } },
            { registrationNumber: { equals: cleanLicense, mode: 'insensitive' } },
          ],
        },
      });
      if (existingLicense) {
        return res.status(409).json({
          success: false,
          error: `A nurse with license number '${cleanLicense}' already exists.`,
        });
      }
    }

    // 4. Generate or validate unique nurse ID
    let assignedNurseId = d.nurseId?.trim();
    if (assignedNurseId) {
      const existingId = await prisma.nurse.findFirst({
        where: { nurseId: { equals: assignedNurseId, mode: 'insensitive' } },
      });
      if (existingId) {
        return res.status(409).json({
          success: false,
          error: `Nurse ID '${assignedNurseId}' already exists.`,
        });
      }
    } else {
      // Auto-generate guaranteed unique institutional Nurse ID (e.g. NUR-1003)
      let candidate = '';
      let isUnique = false;
      while (!isUnique) {
        const rand = Math.floor(1000 + Math.random() * 9000);
        candidate = `NUR-${rand}`;
        const found = await prisma.nurse.findFirst({ where: { nurseId: candidate } });
        if (!found) {
          isUnique = true;
          assignedNurseId = candidate;
        }
      }
    }

    const password_hash = await hashPassword(d.password);

    const { user, nurse } = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: d.email,
          password_hash,
          roleId: nurseRole.id,
        },
      });

      const newNurse = await tx.nurse.create({
        data: {
          nurseId:            assignedNurseId,
          userId:             newUser.id,
          firstName:          d.firstName,
          lastName:           d.lastName,
          phone:              d.phone ?? null,
          registrationNumber: regNo,
          licenseNumber:      d.licenseNumber?.trim() ?? null,
          departmentId:       departmentRow?.id ?? null,
          assignedWard:       d.assignedWard?.trim() ?? null,
        },
      });

      return { user: newUser, nurse: newNurse };
    });

    return res.status(201).json({
      success: true,
      message: 'Nurse account created successfully. Pending admin verification.',
      userId: user.id,
      nurseId: nurse.nurseId,
      registrationNumber: nurse.registrationNumber,
      assignedWard: nurse.assignedWard,
    });
  } catch (err) {
    console.error('[REGISTER] Nurse error:', err);
    return res.status(500).json({ success: false, error: 'Registration failed. Please try again.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/register/doctor
// ─────────────────────────────────────────────────────────────────────────────
const doctorSchema = z.object({
  firstName:        z.string().min(1),
  lastName:         z.string().min(1),
  email:            z.string().email(),
  password:         z.string().min(8),
  phone:            z.string().optional(),
  licenseNumber:    z.string().optional(),
  specialization:   z.string().optional(),
  department:       z.string().optional(),
  yearsOfExperience:z.number().int().min(0).optional(),
});

router.post('/doctor', async (req: Request, res: Response) => {
  try {
    const parsed = doctorSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.flatten().fieldErrors });
    }

    const d = parsed.data;

    const [doctorRole, specializationRow, departmentRow] = await Promise.all([
      prisma.role.findFirst({ where: { name: 'doctor' } }),
      d.specialization ? prisma.specialization.findFirst({ where: { name: { contains: d.specialization, mode: 'insensitive' } } }) : null,
      d.department ? prisma.department.findFirst({ where: { name: { contains: d.department, mode: 'insensitive' } } }) : null,
    ]);

    if (!doctorRole) {
      return res.status(500).json({ success: false, error: 'Doctor role not found in database.' });
    }

    const existing = await prisma.user.findUnique({ where: { email: d.email } });
    if (existing) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists.' });
    }

    if (d.licenseNumber) {
      const existingLicense = await prisma.doctor.findUnique({ where: { licenseNumber: d.licenseNumber } });
      if (existingLicense) {
        return res.status(409).json({ success: false, error: 'A doctor with this license number already exists.' });
      }
    }

    const password_hash = await hashPassword(d.password);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: d.email,
          password_hash,
          roleId: doctorRole.id,
        },
      });

      await tx.doctor.create({
        data: {
          userId:           newUser.id,
          firstName:        d.firstName,
          lastName:         d.lastName,
          phone:            d.phone ?? null,
          licenseNumber:    d.licenseNumber ?? null,
          specializationId: specializationRow?.id ?? null,
          departmentId:     departmentRow?.id ?? null,
          yearsOfExperience:d.yearsOfExperience ?? null,
        },
      });

      return newUser;
    });

    return res.status(201).json({
      success: true,
      message: 'Doctor account created successfully. Pending admin verification.',
      userId: user.id,
    });
  } catch (err) {
    console.error('[REGISTER] Doctor error:', err);
    return res.status(500).json({ success: false, error: 'Registration failed. Please try again.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/register/admin
// ─────────────────────────────────────────────────────────────────────────────
const adminSchema = z.object({
  firstName:    z.string().min(1),
  lastName:     z.string().min(1),
  email:        z.string().email(),
  password:     z.string().min(6),
  phone:        z.string().optional(),
  hospitalName: z.string().optional(),
  department:   z.string().optional(),
  employeeId:   z.string().optional(),
});

router.post('/admin', async (req: Request, res: Response) => {
  try {
    const parsed = adminSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.flatten().fieldErrors });
    }

    const d = parsed.data;

    let adminRole = await prisma.role.findFirst({ where: { name: 'admin' } });
    if (!adminRole) {
      adminRole = await prisma.role.create({ data: { name: 'admin' } });
    }

    const existing = await prisma.user.findUnique({ where: { email: d.email } });
    if (existing) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists.' });
    }

    const password_hash = await hashPassword(d.password);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: d.email,
          password_hash,
          roleId: adminRole!.id,
        },
      });

      // Find or create hospital if provided
      let hospitalId: number | null = null;
      if (d.hospitalName) {
        const existingHosp = await tx.hospital.findFirst({
          where: { name: { contains: d.hospitalName, mode: 'insensitive' } },
        });
        if (existingHosp) {
          hospitalId = existingHosp.id;
        } else {
          const newHosp = await tx.hospital.create({
            data: { name: d.hospitalName },
          });
          hospitalId = newHosp.id;
        }
      }

      await tx.admin.create({
        data: {
          userId:     newUser.id,
          firstName:  d.firstName,
          lastName:   d.lastName,
          phone:      d.phone ?? null,
          hospitalId: hospitalId,
        },
      });

      return newUser;
    });

    return res.status(201).json({
      success: true,
      message: 'Administrator account registered successfully.',
      userId: user.id,
    });
  } catch (err) {
    console.error('[REGISTER] Admin error:', err);
    return res.status(500).json({ success: false, error: 'Registration failed. Please try again.' });
  }
});

export default router;
