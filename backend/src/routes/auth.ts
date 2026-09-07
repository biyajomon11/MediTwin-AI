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

    // Find user in DB by email, email prefix (username), first name, last name, or full name
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: identifier, mode: 'insensitive' } },
          { email: { startsWith: `${identifier}@`, mode: 'insensitive' } },
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
        userId:  user.id,
        email:   user.email,
        role:    user.role.name,
        nurseId: user.nurse?.id,
        patientId: user.patient?.id,
        doctorId: user.doctor?.id,
        adminId: user.admin?.id,
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
        firstName: user.patient?.firstName || user.doctor?.firstName || user.nurse?.firstName || user.admin?.firstName || '',
        lastName:  user.patient?.lastName || user.doctor?.lastName || user.nurse?.lastName || user.admin?.lastName || '',
        nurseId:   user.nurse?.id ?? null,
        patientId: user.patient?.id ?? null,
        doctorId:  user.doctor?.id ?? null,
        adminId:   user.admin?.id ?? null,
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

export default router;
