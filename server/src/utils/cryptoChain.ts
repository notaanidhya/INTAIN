import crypto from 'crypto';

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Creates a deterministic canonical JSON string where object keys are sorted alphabetically.
 */
export function canonicalJson(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJson).join(',') + ']';
  }

  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys
    .filter(k => obj[k] !== undefined)
    .map(k => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`);

  return '{' + pairs.join(',') + '}';
}

/**
 * Extracts the canonical payload of a loan for immutable cryptographic verification.
 */
export function extractCanonicalLoanPayload(loan: any) {
  return {
    loanId: String(loan.loanId || '').trim(),
    borrowerId: loan.borrowerId ? String(loan.borrowerId).trim() : null,
    borrowerName: loan.borrowerName ? String(loan.borrowerName).trim() : null,
    loanType: loan.loanType || 'CONVENTIONAL',
    originalPrincipal: Number(Number(loan.originalPrincipal || 0).toFixed(2)),
    currentBalance: Number(Number(loan.currentBalance || 0).toFixed(2)),
    interestRate: Number(Number(loan.interestRate || 0).toFixed(4)),
    termMonths: Number(loan.termMonths || 360),
    borrowerState: loan.borrowerState ? String(loan.borrowerState).toUpperCase().trim() : null,
    originationDate: loan.originationDate ? new Date(loan.originationDate).toISOString().split('T')[0] : null,
    maturityDate: loan.maturityDate ? new Date(loan.maturityDate).toISOString().split('T')[0] : null,
    paymentStatus: String(loan.paymentStatus || 'CURRENT').toUpperCase().trim(),
    daysPastDue: Number(loan.daysPastDue || 0),
    documentStatus: loan.documentStatus || 'COMPLETE'
  };
}

/**
 * Computes a SHA-256 hash chained to the previous record's hash.
 */
export function computeChainedRecordHash(loanPayload: any, previousHash?: string | null): string {
  const canonicalStr = canonicalJson(loanPayload);
  const prev = previousHash || GENESIS_HASH;
  const combined = `${canonicalStr}|PREV:${prev}`;
  return crypto.createHash('sha256').update(combined, 'utf8').digest('hex');
}

/**
 * Computes a Merkle Root or cumulative tree hash from an array of SHA-256 hashes.
 */
export function computeMerkleRoot(hashes: string[]): string {
  if (!hashes || hashes.length === 0) {
    return crypto.createHash('sha256').update('EMPTY_MERKLE_TREE').digest('hex');
  }

  let currentLevel = [...hashes];

  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
      const combined = crypto.createHash('sha256').update(left + right).digest('hex');
      nextLevel.push(combined);
    }
    currentLevel = nextLevel;
  }

  return currentLevel[0];
}

export interface IntegrityCheckResult {
  isValid: boolean;
  totalRecordsChecked: number;
  brokenRecordId?: string;
  brokenLoanId?: string;
  expectedHash?: string;
  storedHash?: string;
  merkleRoot: string;
  checkedAt: string;
  message: string;
}

/**
 * Validates the entire sequential cryptographic chain across all verified records.
 */
export function verifyChainIntegrity(verifiedLoans: any[]): IntegrityCheckResult {
  const sorted = [...verifiedLoans].sort((a, b) => {
    const timeA = new Date(a.verifiedAt || a.createdAt).getTime();
    const timeB = new Date(b.verifiedAt || b.createdAt).getTime();
    return timeA - timeB;
  });

  let previousHash = GENESIS_HASH;
  const verifiedHashes: string[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const loan = sorted[i];
    const canonicalPayload = extractCanonicalLoanPayload(loan);
    const expectedHash = computeChainedRecordHash(canonicalPayload, previousHash);

    if (loan.recordHash !== expectedHash) {
      return {
        isValid: false,
        totalRecordsChecked: i + 1,
        brokenRecordId: loan.id,
        brokenLoanId: loan.loanId,
        expectedHash,
        storedHash: loan.recordHash || 'NULL',
        merkleRoot: computeMerkleRoot(verifiedHashes),
        checkedAt: new Date().toISOString(),
        message: `Tamper detected at record index ${i} (Loan ID: ${loan.loanId}). Stored hash does not match computed chained hash.`
      };
    }

    verifiedHashes.push(loan.recordHash);
    previousHash = loan.recordHash;
  }

  const root = computeMerkleRoot(verifiedHashes);

  return {
    isValid: true,
    totalRecordsChecked: sorted.length,
    merkleRoot: root,
    checkedAt: new Date().toISOString(),
    message: sorted.length > 0 
      ? `Cryptographic chain integrity verified successfully across ${sorted.length} records. Merkle Root: ${root.substring(0, 16)}...`
      : 'No verified records to evaluate. Ledger is empty.'
  };
}
