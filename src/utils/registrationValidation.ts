/**
 * Registration Validation Utility for MediTwin AI
 *
 * Provides comprehensive, unified validation across all institutional user roles
 * (Patient, Doctor, Nurse, Hospital Administrator) for both online (live backend)
 * and offline/client-side storage modes.
 */

export interface SystemUserAccount {
  email: string;
  username: string;
  role: 'doctor' | 'nurse' | 'patient' | 'admin';
  fullName: string;
  licenseNumber?: string;
  registrationNumber?: string;
  employeeId?: string;
}

// Built-in institutional accounts present in default seed and test suites
export const BUILT_IN_SYSTEM_USERS: SystemUserAccount[] = [
  {
    email: 'sarah.jenkins@meditwin.local',
    username: 'sarah_jenkins',
    role: 'doctor',
    fullName: 'Dr. Sarah Jenkins',
    licenseNumber: 'DOC-1001',
  },
  {
    email: 'doctor.rohith@meditwin.local',
    username: 'doctor_rohith',
    role: 'doctor',
    fullName: 'Dr. Rohith Sharma',
    licenseNumber: 'DOC-1002',
  },
  {
    email: 'test.doctor@meditwin.local',
    username: 'doctor_demo',
    role: 'doctor',
    fullName: 'Dr. Sarah Chen',
    licenseNumber: 'DOC-1003',
  },
  {
    email: 'demo.doctor@meditwin.local',
    username: 'doctor_demo',
    role: 'doctor',
    fullName: 'Dr. Sarah Chen',
    licenseNumber: 'DOC-1003',
  },
  {
    email: 'test.nurse@meditwin.local',
    username: 'nurse_demo',
    role: 'nurse',
    fullName: 'Angel Renoy',
    registrationNumber: 'NRN-2024-001',
  },
  {
    email: 'demo.nurse@meditwin.local',
    username: 'nurse_demo',
    role: 'nurse',
    fullName: 'Angel Renoy',
    registrationNumber: 'NRN-2024-001',
  },
  {
    email: 'noyal.nurse@meditwin.local',
    username: 'noyal_nurse',
    role: 'nurse',
    fullName: 'Noyal Nurse',
    registrationNumber: 'NRN-2024-002',
  },
  {
    email: 'test.patient@meditwin.local',
    username: 'patient_demo',
    role: 'patient',
    fullName: 'John Doe',
  },
  {
    email: 'demo.patient@meditwin.local',
    username: 'patient_demo',
    role: 'patient',
    fullName: 'John Doe',
  },
  {
    email: 'patient.test@meditwin.local',
    username: 'marcus_vance',
    role: 'patient',
    fullName: 'Marcus Vance',
  },
  {
    email: 'test.admin@meditwin.local',
    username: 'admin_demo',
    role: 'admin',
    fullName: 'System Administrator',
    employeeId: 'ADM-001',
  },
  {
    email: 'demo.admin@meditwin.local',
    username: 'admin_demo',
    role: 'admin',
    fullName: 'System Administrator',
    employeeId: 'ADM-001',
  },
  {
    email: 'admin@meditwin.local',
    username: 'admin',
    role: 'admin',
    fullName: 'Hospital Administrator',
    employeeId: 'ADM-002',
  },
  {
    email: 'alex.mercer@meditwin.local',
    username: 'alex_mercer',
    role: 'admin',
    fullName: 'Alex Mercer',
    employeeId: 'ADM-003',
  },
];

export interface DuplicateCheckInput {
  email?: string;
  username?: string;
  licenseNumber?: string;
  registrationNumber?: string;
  employeeId?: string;
  role?: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  field?: 'email' | 'username' | 'licenseNumber' | 'registrationNumber' | 'employeeId';
  error?: string;
}

/**
 * Retrieves all registered users from local browser storage
 */
export const getStoredRegisteredUsers = (): any[] => {
  try {
    const raw = localStorage.getItem('meditwin_registered_users');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/**
 * Validates whether an email, username, or institutional credential
 * already exists in either the built-in catalog or local registered users store.
 */
export const isDuplicateRegistration = (
  input: DuplicateCheckInput
): DuplicateCheckResult => {
  const normEmail = (input.email || '').trim().toLowerCase();
  const normUsername = (input.username || '').trim().toLowerCase();
  const normLicense = (input.licenseNumber || '').trim().toLowerCase();
  const normRegNo = (input.registrationNumber || '').trim().toLowerCase();
  const normEmpId = (input.employeeId || '').trim().toLowerCase();

  const storedUsers = getStoredRegisteredUsers();

  // 1. Email check
  if (normEmail) {
    const builtInMatch = BUILT_IN_SYSTEM_USERS.some(
      (u) => u.email.toLowerCase() === normEmail
    );
    if (builtInMatch) {
      return {
        isDuplicate: true,
        field: 'email',
        error: 'An account with this email already exists.',
      };
    }

    const localMatch = storedUsers.some((u: any) => {
      const email = typeof u.email === 'string' ? u.email.toLowerCase() : '';
      return email === normEmail;
    });
    if (localMatch) {
      return {
        isDuplicate: true,
        field: 'email',
        error: 'An account with this email already exists.',
      };
    }
  }

  // 2. Username check
  if (normUsername) {
    const builtInMatch = BUILT_IN_SYSTEM_USERS.some(
      (u) => u.username.toLowerCase() === normUsername
    );
    if (builtInMatch) {
      return {
        isDuplicate: true,
        field: 'username',
        error: 'An account with this username already exists.',
      };
    }

    const localMatch = storedUsers.some((u: any) => {
      const uname = typeof u.username === 'string' ? u.username.toLowerCase() : '';
      return uname === normUsername;
    });
    if (localMatch) {
      return {
        isDuplicate: true,
        field: 'username',
        error: 'An account with this username already exists.',
      };
    }
  }

  // 3. Doctor License Number check
  if (normLicense) {
    const builtInMatch = BUILT_IN_SYSTEM_USERS.some(
      (u) => u.licenseNumber && u.licenseNumber.toLowerCase() === normLicense
    );
    if (builtInMatch) {
      return {
        isDuplicate: true,
        field: 'licenseNumber',
        error: 'A doctor with this license number already exists.',
      };
    }

    const localMatch = storedUsers.some((u: any) => {
      const lic = typeof u.licenseNumber === 'string' ? u.licenseNumber.toLowerCase() : '';
      return lic === normLicense;
    });
    if (localMatch) {
      return {
        isDuplicate: true,
        field: 'licenseNumber',
        error: 'A doctor with this license number already exists.',
      };
    }
  }

  // 4. Nursing Registration Number check
  if (normRegNo) {
    const builtInMatch = BUILT_IN_SYSTEM_USERS.some(
      (u) => u.registrationNumber && u.registrationNumber.toLowerCase() === normRegNo
    );
    if (builtInMatch) {
      return {
        isDuplicate: true,
        field: 'registrationNumber',
        error: `Nursing registration number '${input.registrationNumber}' is already registered with another nurse.`,
      };
    }

    const localMatch = storedUsers.some((u: any) => {
      const reg1 = typeof u.registrationNumber === 'string' ? u.registrationNumber.toLowerCase() : '';
      const reg2 = typeof u.nursingRegNo === 'string' ? u.nursingRegNo.toLowerCase() : '';
      return reg1 === normRegNo || reg2 === normRegNo;
    });
    if (localMatch) {
      return {
        isDuplicate: true,
        field: 'registrationNumber',
        error: `Nursing registration number '${input.registrationNumber}' is already registered with another nurse.`,
      };
    }
  }

  // 5. Admin Employee ID check
  if (normEmpId) {
    const builtInMatch = BUILT_IN_SYSTEM_USERS.some(
      (u) => u.employeeId && u.employeeId.toLowerCase() === normEmpId
    );
    if (builtInMatch) {
      return {
        isDuplicate: true,
        field: 'employeeId',
        error: 'An administrator with this Employee ID already exists.',
      };
    }

    const localMatch = storedUsers.some((u: any) => {
      const emp = typeof u.employeeId === 'string' ? u.employeeId.toLowerCase() : '';
      return emp === normEmpId;
    });
    if (localMatch) {
      return {
        isDuplicate: true,
        field: 'employeeId',
        error: 'An administrator with this Employee ID already exists.',
      };
    }
  }

  return { isDuplicate: false };
};

/**
 * Standard password security validator
 */
export const validatePasswordStrength = (password: string) => {
  const minLength = password.length >= 8;
  const uppercase = /[A-Z]/.test(password);
  const lowercase = /[a-z]/.test(password);
  const number = /[0-9]/.test(password);
  const special = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  let score = 0;
  if (password.length > 0) {
    if (minLength) score++;
    if (uppercase) score++;
    if (lowercase) score++;
    if (number) score++;
    if (special) score++;
  }

  let strengthLabel: 'Weak' | 'Medium' | 'Strong' = 'Weak';
  if (score >= 4) strengthLabel = 'Strong';
  else if (score >= 2) strengthLabel = 'Medium';

  const isValid = minLength && uppercase && lowercase && number && special;

  return {
    score,
    strengthLabel,
    isValid,
    checks: {
      minLength,
      uppercase,
      lowercase,
      number,
      special,
    },
  };
};

/**
 * Email format validation helper
 */
export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  const trimmed = email.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Email address is required.' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: 'Please enter a valid email address.' };
  }
  return { isValid: true };
};

/**
 * Phone number validation helper
 */
export const validatePhone = (phone: string): { isValid: boolean; error?: string } => {
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
  if (!cleaned) {
    return { isValid: false, error: 'Phone number is required.' };
  }
  if (!/^\d{7,15}$/.test(cleaned)) {
    return { isValid: false, error: 'Please enter a valid phone number (at least 7 digits).' };
  }
  return { isValid: true };
};
