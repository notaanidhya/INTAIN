/**
 * Fuzzy Matching utilities for duplicate and repeat borrower detection.
 */

export function levenshteinDistance(str1: string, str2: string): number {
  const s1 = (str1 || '').toLowerCase().trim();
  const s2 = (str2 || '').toLowerCase().trim();

  const m = s1.length;
  const n = s2.length;

  if (m === 0) return n;
  if (n === 0) return m;

  const d: number[][] = [];
  for (let i = 0; i <= m; i++) {
    d[i] = [i];
  }
  for (let j = 0; j <= n; j++) {
    d[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,      // deletion
        d[i][j - 1] + 1,      // insertion
        d[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return d[m][n];
}

export function stringSimilarity(str1: string, str2: string): number {
  const s1 = (str1 || '').toLowerCase().trim();
  const s2 = (str2 || '').toLowerCase().trim();
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  const distance = levenshteinDistance(s1, s2);
  return Math.max(0, 1 - distance / maxLen);
}

export interface FuzzyCheckResult {
  isMatch: boolean;
  confidence: number;
  reason: string;
}

export function checkFuzzyDuplicate(
  nameA?: string | null,
  amountA?: number | null,
  dateA?: Date | string | null,
  nameB?: string | null,
  amountB?: number | null,
  dateB?: Date | string | null
): FuzzyCheckResult {
  if (!nameA || !nameB) {
    return { isMatch: false, confidence: 0, reason: 'Missing name information' };
  }

  const nameSim = stringSimilarity(nameA, nameB);
  
  // Exact name or high similarity (e.g. "Jon Doe" vs "John Doe")
  if (nameSim >= 0.82) {
    const amtDiff = amountA != null && amountB != null ? Math.abs(amountA - amountB) : Infinity;
    const sameAmount = amtDiff < 1.0; // within $1

    let sameDateMonth = false;
    if (dateA && dateB) {
      const dA = new Date(dateA);
      const dB = new Date(dateB);
      if (!isNaN(dA.getTime()) && !isNaN(dB.getTime())) {
        const diffDays = Math.abs((dA.getTime() - dB.getTime()) / (1000 * 60 * 60 * 24));
        sameDateMonth = diffDays <= 30;
      }
    }

    if (sameAmount && sameDateMonth) {
      return {
        isMatch: true,
        confidence: Math.min(0.98, nameSim * 0.95 + 0.05),
        reason: `Potential duplicate loan: Borrower similarity (${Math.round(nameSim * 100)}%), matching principal ($${amountA}), and close origination window.`
      };
    }

    if (sameAmount) {
      return {
        isMatch: true,
        confidence: 0.85,
        reason: `Suspicious repeated borrower: Borrower similarity (${Math.round(nameSim * 100)}%) with identical loan amount ($${amountA}).`
      };
    }
  }

  return { isMatch: false, confidence: nameSim, reason: 'No significant similarity' };
}
