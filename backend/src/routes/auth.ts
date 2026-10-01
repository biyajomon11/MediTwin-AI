import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

const loginSchema = z.object({
  email:    z.string().min(1, { message: 'Email or username is required.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

/**
 * POST /api/auth/login
 * Authenticates a user and issues a JWT.
 * User role and profile are dynamically retrieved from the database.
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { email, password } = parsed.data;
    const secret = process.env.JWT_SECRET || 'super-secret-meditwin-jwt-key';

    const identifier = email.trim();
    const nameParts = identifier.split(/\s+/);

    // Find user in DB by email, email prefix (username), nurse registration number, nurse ID, license number, or name
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: identifier, mode: 'insensitive' } },
          { email: { startsWith: `${identifier}@`, mode: 'insensitive' } },
          // Unique nurse credentials
          { nurse:   { registrationNumber: { equals: identifier, mode: 'insensitive' } } },
          { nurse:   { nurseId: { equals: identifier, mode: 'insensitive' } } },
          { nurse:   { licenseNumber: { equals: identifier, mode: 'insensitive' } } },
          // Unique doctor credentials
          { doctor:  { licenseNumber: { equals: identifier, mode: 'insensitive' } } },
          // First name matches
          { doctor:  { firstName: { equals: identifier, mode: 'insensitive' } } },
          { nurse:   { firstName: { equals: identifier, mode: 'insensitive' } } },
          { patient: { firstName: { equals: identifier, mode: 'insensitive' } } },
          { admin:   { firstName: { equals: identifier, mode: 'insensitive' } } },
          // Last name matches
          { doctor:  { lastName:  { equals: identifier, mode: 'insensitive' } } },
          { nurse:   { lastName:  { equals: identifier, mode: 'insensitive' } } },
          { patient: { lastName:  { equals: identifier, mode: 'insensitive' } } },
          { admin:   { lastName:  { equals: identifier, mode: 'insensitive' } } },
          // Full name matches (when identifier contains space)
          ...(nameParts.length >= 2 ? [
            { patient: { firstName: { equals: nameParts[0], mode: 'insensitive' as const }, lastName: { equals: nameParts.slice(1).join(' '), mode: 'insensitive' as const } } },
            { doctor:  { firstName: { equals: nameParts[0], mode: 'insensitive' as const }, lastName: { equals: nameParts.slice(1).join(' '), mode: 'insensitive' as const } } },
            { nurse:   { firstName: { equals: nameParts[0], mode: 'insensitive' as const }, lastName: { equals: nameParts.slice(1).join(' '), mode: 'insensitive' as const } } },
            { admin:   { firstName: { equals: nameParts[0], mode: 'insensitive' as const }, lastName: { equals: nameParts.slice(1).join(' '), mode: 'insensitive' as const } } },
          ] : []),
        ],
      },
      include: {
        role:    true,
        nurse:   true,
        doctor:  true,
        patient: true,
        admin:   true,
      },
    });

    // User not found — return generic error (don't reveal which field is wrong)
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
      });
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
      });
    }

    const token = jwt.sign(
      {
        userId:             user.id,
        email:              user.email,
        role:               user.role.name,
        nurseId:            user.nurse?.id,
        nurseCode:          user.nurse?.nurseId,
        registrationNumber: user.nurse?.registrationNumber,
        assignedWard:       user.nurse?.assignedWard ?? null,
        patientId:          user.patient?.id,
        doctorId:           user.doctor?.id,
        adminId:            user.admin?.id,
      },
      secret,
      { expiresIn: '12h' }
    );

    return res.json({
      success: true,
      token,
      user: {
        userId:             user.id,
        email:              user.email,
        role:               user.role.name,
        firstName:          user.patient?.firstName || user.doctor?.firstName || user.nurse?.firstName || user.admin?.firstName || '',
        lastName:           user.patient?.lastName || user.doctor?.lastName || user.nurse?.lastName || user.admin?.lastName || '',
        nurseId:            user.nurse?.id ?? null,
        nurseCode:          user.nurse?.nurseId ?? null,
        registrationNumber: user.nurse?.registrationNumber ?? null,
        licenseNumber:      user.nurse?.licenseNumber ?? null,
        assignedWard:       user.nurse?.assignedWard ?? null,
        patientId:          user.patient?.id ?? null,
        doctorId:           user.doctor?.id ?? null,
        adminId:            user.admin?.id ?? null,
      },
    });
  } catch (err) {
    console.error('[AUTH] Login error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during authentication.',
    });
  }
});

/**
 * POST /api/auth/google
 * Authenticates or registers a user via Google Sign-In.
 */
router.post('/google', async (req: Request, res: Response) => {
  try {
    const { email, firstName, lastName, role, googleId, picture } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'A valid email address is required for Google authentication.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const secret = process.env.JWT_SECRET || 'super-secret-meditwin-jwt-key';

    // 1. Check if user already exists in DB
    let user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: {
        role:    true,
        nurse:   true,
        doctor:  true,
        patient: true,
        admin:   true,
      },
    });

    // 2. If user does not exist, provision an account
    if (!user) {
      const requestedRoleName = (role && typeof role === 'string' ? role.toLowerCase() : 'patient');
      
      // Match role in database or fallback
      let roleRecord = await prisma.role.findFirst({
        where: { name: { equals: requestedRoleName, mode: 'insensitive' } },
      });

      if (!roleRecord) {
        roleRecord = await prisma.role.findFirst({
          where: { name: 'patient' },
        }) || await prisma.role.findFirst();
      }

      if (!roleRecord) {
        return res.status(500).json({
          success: false,
          error: 'System roles not initialized in database.',
        });
      }

      const fName = firstName || cleanEmail.split('@')[0] || 'Google';
      const lName = lastName || 'User';
      const randomPasswordHash = await bcrypt.hash(`oauth_google_${Date.now()}_${Math.random()}`, 10);

      // Create User
      const newUser = await prisma.user.create({
        data: {
          email: cleanEmail,
          password_hash: randomPasswordHash,
          roleId: roleRecord.id,
          isActive: true,
        },
      });

      // Create linked profile according to role
      const roleLower = roleRecord.name.toLowerCase();
      if (roleLower === 'doctor') {
        await prisma.doctor.create({
          data: {
            userId: newUser.id,
            firstName: fName,
            lastName: lName,
            licenseNumber: `DOC-G-${Date.now().toString().slice(-6)}`,
          },
        });
      } else if (roleLower === 'nurse') {
        await prisma.nurse.create({
          data: {
            userId: newUser.id,
            firstName: fName,
            lastName: lName,
            licenseNumber: `NUR-G-${Date.now().toString().slice(-6)}`,
          },
        });
      } else if (roleLower === 'admin' || roleLower === 'hospital-admin') {
        await prisma.admin.create({
          data: {
            userId: newUser.id,
            firstName: fName,
            lastName: lName,
          },
        });
      } else {
        // Patient default
        await prisma.patient.create({
          data: {
            userId: newUser.id,
            firstName: fName,
            lastName: lName,
            dateOfBirth: new Date('1995-01-01'),
          },
        });
      }

      // Re-fetch user with relations
      user = await prisma.user.findUnique({
        where: { id: newUser.id },
        include: {
          role:    true,
          nurse:   true,
          doctor:  true,
          patient: true,
          admin:   true,
        },
      });
    }

    if (!user) {
      return res.status(500).json({
        success: false,
        error: 'Failed to provision Google account session.',
      });
    }

    const token = jwt.sign(
      {
        userId:    user.id,
        email:     user.email,
        role:      user.role.name,
        nurseId:   user.nurse?.id,
        patientId: user.patient?.id,
        doctorId:  user.doctor?.id,
        adminId:   user.admin?.id,
      },
      secret,
      { expiresIn: '12h' }
    );

    return res.json({
      success: true,
      token,
      user: {
        userId:    user.id,
        email:     user.email,
        role:      user.role.name,
        firstName: user.patient?.firstName || user.doctor?.firstName || user.nurse?.firstName || user.admin?.firstName || (cleanEmail.split('@')[0]),
        lastName:  user.patient?.lastName || user.doctor?.lastName || user.nurse?.lastName || user.admin?.lastName || '',
        nurseId:      user.nurse?.id ?? null,
        nurseCode:    user.nurse?.nurseId ?? null,
        assignedWard: user.nurse?.assignedWard ?? null,
        patientId:    user.patient?.id ?? null,
        doctorId:     user.doctor?.id ?? null,
        adminId:      user.admin?.id ?? null,
      },
    });
  } catch (err) {
    console.error('[AUTH] Google Sign-In error:', err);
    return res.status(500).json({
      success: false,
      error: 'Google authentication service encounter an error.',
    });
  }
});

export default router;
