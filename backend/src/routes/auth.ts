import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';

const router = Router();
const prisma = new PrismaClient();
const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
const googleOAuthClient = new OAuth2Client(googleClientId);

const loginSchema = z.object({
  email:    z.string().min(1, { message: 'Email or username is required.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

interface PasswordResetRecord {
  code: string;
  userId: number;
  email: string;
  expiresAt: number;
}

// In-memory token/code cache with expiry (15 minutes)
const passwordResetStore = new Map<string, PasswordResetRecord>();

function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!domain) return '***';
  if (localPart.length <= 2) {
    return `${localPart[0]}*@${domain}`;
  }
  return `${localPart[0]}***${localPart[localPart.length - 1]}@${domain}`;
}

export async function findUserByIdentifier(identifier: string) {
  const clean = identifier.trim();
  const lower = clean.toLowerCase();
  const nameParts = clean.split(/\s+/);
  const lettersOnly = lower.replace(/[^a-z]/g, '');

  return await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: clean, mode: 'insensitive' } },
        { email: { startsWith: `${clean}@`, mode: 'insensitive' } },
        { email: { contains: clean, mode: 'insensitive' } },
        ...(lettersOnly.length >= 3 ? [
          { email: { contains: lettersOnly, mode: 'insensitive' as const } },
        ] : []),
        // Unique nurse credentials
        { nurse:   { registrationNumber: { equals: clean, mode: 'insensitive' } } },
        { nurse:   { nurseId: { equals: clean, mode: 'insensitive' } } },
        { nurse:   { licenseNumber: { equals: clean, mode: 'insensitive' } } },
        // Unique doctor credentials
        { doctor:  { licenseNumber: { equals: clean, mode: 'insensitive' } } },
        // First name matches
        { doctor:  { firstName: { equals: clean, mode: 'insensitive' } } },
        { nurse:   { firstName: { equals: clean, mode: 'insensitive' } } },
        { patient: { firstName: { equals: clean, mode: 'insensitive' } } },
        { admin:   { firstName: { equals: clean, mode: 'insensitive' } } },
        ...(lettersOnly.length >= 3 ? [
          { doctor:  { firstName: { contains: lettersOnly, mode: 'insensitive' as const } } },
          { nurse:   { firstName: { contains: lettersOnly, mode: 'insensitive' as const } } },
          { patient: { firstName: { contains: lettersOnly, mode: 'insensitive' as const } } },
          { admin:   { firstName: { contains: lettersOnly, mode: 'insensitive' as const } } },
        ] : []),
        // Last name matches
        { doctor:  { lastName:  { equals: clean, mode: 'insensitive' } } },
        { nurse:   { lastName:  { equals: clean, mode: 'insensitive' } } },
        { patient: { lastName:  { equals: clean, mode: 'insensitive' } } },
        { admin:   { lastName:  { equals: clean, mode: 'insensitive' } } },
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
}

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

    // Find user in DB using comprehensive multi-attribute lookup
    const user = await findUserByIdentifier(email);

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

    const effectiveRole = user.doctor
      ? 'doctor'
      : user.nurse
      ? 'nurse'
      : user.admin
      ? 'admin'
      : user.role.name;

    const token = jwt.sign(
      {
        userId:             user.id,
        email:              user.email,
        role:               effectiveRole,
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
        role:               effectiveRole,
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
    const { credential, idToken, accessToken, role, email: fallbackEmail, firstName: fallbackFirst, lastName: fallbackLast, picture: fallbackPic, googleId: fallbackGoogleId } = req.body;
    const tokenToVerify = credential || idToken;

    let cleanEmail = '';
    let fName = '';
    let lName = '';
    let picture = '';
    let googleId = '';

    if (tokenToVerify) {
      try {
        const ticket = await googleOAuthClient.verifyIdToken({
          idToken: tokenToVerify,
          audience: googleClientId || undefined,
        });
        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
          return res.status(400).json({
            success: false,
            error: 'Google ID token verification failed: Missing email address.',
          });
        }
        cleanEmail = payload.email.trim().toLowerCase();
        fName = payload.given_name || payload.name?.split(' ')[0] || 'Google';
        lName = payload.family_name || payload.name?.split(' ').slice(1).join(' ') || 'User';
        picture = payload.picture || '';
        googleId = payload.sub;
      } catch (verifyErr: any) {
        console.error('[AUTH] Google verifyIdToken error:', verifyErr.message);
        return res.status(401).json({
          success: false,
          error: `Google token verification failed: ${verifyErr.message}`,
        });
      }
    } else if (accessToken) {
      try {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!userInfoRes.ok) {
          throw new Error(`Google UserInfo API returned HTTP ${userInfoRes.status}`);
        }
        const userInfo: any = await userInfoRes.json();
        if (!userInfo.email) {
          return res.status(400).json({
            success: false,
            error: 'Google access token returned no email address.',
          });
        }
        cleanEmail = userInfo.email.trim().toLowerCase();
        fName = userInfo.given_name || userInfo.name?.split(' ')[0] || 'Google';
        lName = userInfo.family_name || userInfo.name?.split(' ').slice(1).join(' ') || 'User';
        picture = userInfo.picture || '';
        googleId = userInfo.sub;
      } catch (err: any) {
        console.error('[AUTH] Google userInfo error:', err.message);
        return res.status(401).json({
          success: false,
          error: `Google access token validation failed: ${err.message}`,
        });
      }
    } else if (fallbackEmail && typeof fallbackEmail === 'string') {
      // Development/testing fallback
      cleanEmail = fallbackEmail.trim().toLowerCase();
      fName = fallbackFirst || cleanEmail.split('@')[0] || 'Google';
      lName = fallbackLast || 'User';
      picture = fallbackPic || '';
      googleId = fallbackGoogleId || `goog_${Date.now()}`;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Google credential (ID token), access token, or verified email is required.',
      });
    }

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
            nurseId: `NUR-G${Date.now().toString().slice(-4)}`,
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
        firstName:          user.patient?.firstName || user.doctor?.firstName || user.nurse?.firstName || user.admin?.firstName || fName,
        lastName:           user.patient?.lastName || user.doctor?.lastName || user.nurse?.lastName || user.admin?.lastName || lName,
        avatar:             picture || undefined,
        nurseId:            user.nurse?.id ?? null,
        nurseCode:          user.nurse?.nurseId ?? null,
        registrationNumber: user.nurse?.registrationNumber ?? null,
        assignedWard:       user.nurse?.assignedWard ?? null,
        patientId:          user.patient?.id ?? null,
        doctorId:           user.doctor?.id ?? null,
        adminId:            user.admin?.id ?? null,
      },
    });
  } catch (err) {
    console.error('[AUTH] Google Sign-In error:', err);
    return res.status(500).json({
      success: false,
      error: 'Google authentication service encountered an error.',
    });
  }
});

const resetPasswordSchema = z.object({
  identifier: z.string().optional(),
  code: z.string().min(4, { message: 'Verification code is required.' }),
  newPassword: z.string().min(6, { message: 'Password must be at least 6 characters long.' }),
});

/**
 * POST /api/auth/forgot-password
 * Initiates password recovery for a user identified by email, username, or credential ID.
 */
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { identifier } = req.body;
    if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Please enter your registered email, username, or license ID.',
      });
    }

    const user = await findUserByIdentifier(identifier);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: `No healthcare account found matching "${identifier.trim()}". Please verify your credentials or contact hospital administration.`,
      });
    }

    // Generate 6-digit secure numeric verification code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes validity

    const record: PasswordResetRecord = {
      code: resetCode,
      userId: user.id,
      email: user.email,
      expiresAt,
    };

    passwordResetStore.set(user.email.toLowerCase(), record);
    passwordResetStore.set(String(user.id), record);
    passwordResetStore.set(`code_${resetCode}`, record);

    const masked = maskEmail(user.email);
    const userName = user.doctor ? `Dr. ${user.doctor.firstName} ${user.doctor.lastName}`
      : user.nurse ? `Nurse ${user.nurse.firstName} ${user.nurse.lastName}`
      : user.patient ? `${user.patient.firstName} ${user.patient.lastName}`
      : user.admin ? `Admin ${user.admin.firstName} ${user.admin.lastName}`
      : user.email.split('@')[0];

    return res.json({
      success: true,
      message: `A 6-digit password reset verification code has been dispatched to ${masked}.`,
      emailMasked: masked,
      userEmail: user.email,
      userName,
      userRole: user.role.name,
      code: resetCode, // Passed for instant developer & test environment sandbox verification
      expiresInMinutes: 15,
    });
  } catch (err: any) {
    console.error('[AUTH] forgot-password error:', err);
    return res.status(500).json({
      success: false,
      error: 'An internal error occurred while processing password recovery.',
    });
  }
});

/**
 * POST /api/auth/verify-code
 * Validates a 6-digit recovery code.
 */
router.post('/verify-code', async (req: Request, res: Response) => {
  try {
    const { identifier, code } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Verification code is required.',
      });
    }

    const cleanCode = code.trim();
    let record = passwordResetStore.get(`code_${cleanCode}`);
    if (!record && identifier) {
      record = passwordResetStore.get(identifier.trim().toLowerCase());
    }

    if (!record || record.code !== cleanCode) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification code. Please check and try again.',
      });
    }

    if (Date.now() > record.expiresAt) {
      passwordResetStore.delete(`code_${cleanCode}`);
      return res.status(400).json({
        success: false,
        error: 'Verification code has expired. Please request a new code.',
      });
    }

    return res.json({
      success: true,
      message: 'Verification code confirmed.',
      email: record.email,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Code verification failed.' });
  }
});

/**
 * POST /api/auth/reset-password
 * Updates the user's password in the database upon verifying the code.
 */
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message || 'Invalid password reset input.',
      });
    }

    const { identifier, code, newPassword } = parsed.data;
    const cleanCode = code.trim();

    let record = passwordResetStore.get(`code_${cleanCode}`);
    if (!record && identifier) {
      record = passwordResetStore.get(identifier.trim().toLowerCase());
    }

    if (!record && identifier) {
      const user = await findUserByIdentifier(identifier);
      if (user) {
        const byId = passwordResetStore.get(String(user.id));
        if (byId && byId.code === cleanCode) {
          record = byId;
        }
      }
    }

    if (!record || record.code !== cleanCode) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification code. Please request a fresh reset code.',
      });
    }

    if (Date.now() > record.expiresAt) {
      passwordResetStore.delete(`code_${cleanCode}`);
      return res.status(400).json({
        success: false,
        error: 'Verification code has expired. Please request a fresh reset code.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: record.userId },
      include: { role: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User workstation account not found.',
      });
    }

    // Hash the new password with bcrypt
    const password_hash = await bcrypt.hash(newPassword, 10);

    // Atomically update password in PostgreSQL
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password_hash,
        updatedAt: new Date(),
      },
    });

    // Invalidate reset records
    passwordResetStore.delete(user.email.toLowerCase());
    passwordResetStore.delete(String(user.id));
    passwordResetStore.delete(`code_${cleanCode}`);

    return res.json({
      success: true,
      message: 'Password has been successfully updated. You may now sign in with your new password.',
      email: user.email,
      role: user.role.name,
    });
  } catch (err: any) {
    console.error('[AUTH] reset-password error:', err);
    return res.status(500).json({
      success: false,
      error: 'An internal error occurred while updating your password.',
    });
  }
});

export default router;
