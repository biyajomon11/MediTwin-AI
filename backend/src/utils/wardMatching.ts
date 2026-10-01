/**
 * wardMatching.ts
 * Canonical ward matching utility for Nurse Ward Allocation
 */

export function normalizeWard(ward?: string | null): string {
  if (!ward) return '';
  return ward
    .toLowerCase()
    .replace(/[–—\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks whether a patient's ward matches the nurse's assigned ward.
 * Handles "General Ward 2B", "Ward 2B", "Ward 2", "Ward 1", "ICU", etc.
 */
export function matchesWard(patientWard?: string | null, nurseWard?: string | null): boolean {
  if (!nurseWard || !nurseWard.trim()) return true;
  if (!patientWard || !patientWard.trim()) return false;

  const p = normalizeWard(patientWard);
  const n = normalizeWard(nurseWard);

  // 1. Direct or partial substring matching
  if (p === n || p.includes(n) || n.includes(p)) return true;

  // 2. ICU check
  if (n.includes('icu')) {
    return p.includes('icu');
  }

  // 3. Extract canonical ward token (e.g. "2b", "2", "1", "3", "4")
  const extractToken = (str: string) => {
    const m = str.match(/(?:general\s+)?ward\s*([0-9]+[a-z]?)/i);
    if (m) return m[1].toLowerCase();
    const token = str.match(/\b([0-9]+[a-z]?)\b/i);
    return token ? token[1].toLowerCase() : '';
  };

  const pToken = extractToken(p);
  const nToken = extractToken(n);

  if (pToken && nToken) {
    if (pToken === nToken) return true;
    // "2b" nurse matches "2b" and "2" patients, and vice versa
    if (nToken === '2b' && (pToken === '2b' || pToken === '2')) return true;
    if (pToken === '2b' && (nToken === '2b' || nToken === '2')) return true;
  }

  return false;
}

/**
 * Returns Prisma OR conditions for ward filtering on patient query
 */
export function getWardFilterConditions(nurseWard: string) {
  const clean = nurseWard.trim();
  const conditions: any[] = [
    { ward: { contains: clean, mode: 'insensitive' as const } },
  ];

  if (/icu/i.test(clean)) {
    conditions.push({ ward: { contains: 'ICU', mode: 'insensitive' as const } });
    return conditions;
  }

  const wardMatch = clean.match(/(?:general\s+)?ward\s*([0-9]+[a-z]?)/i);
  if (wardMatch) {
    const key = wardMatch[1]; // e.g. "2B" or "1"
    conditions.push(
      { ward: { contains: `Ward ${key}`, mode: 'insensitive' as const } },
      { ward: { contains: `General Ward ${key}`, mode: 'insensitive' as const } },
      { ward: { contains: key, mode: 'insensitive' as const } }
    );
    if (/^[0-9]+[a-z]$/i.test(key)) {
      const numOnly = key.replace(/[a-z]/i, '');
      conditions.push(
        { ward: { contains: `Ward ${numOnly}`, mode: 'insensitive' as const } }
      );
    }
  }

  return conditions;
}
