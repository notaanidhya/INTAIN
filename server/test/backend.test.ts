import assert from 'assert';
import {
  canonicalJson,
  extractCanonicalLoanPayload,
  computeChainedRecordHash,
  computeMerkleRoot,
  verifyChainIntegrity,
  GENESIS_HASH
} from '../src/utils/cryptoChain';
import { IngestionService } from '../src/services/ingestion.service';
import { ValidationService } from '../src/services/validation.service';
import { DEFAULT_VALIDATION_RULES } from '../src/config/defaultRules';

async function runTests() {
  console.log('🧪 Starting Intain Backend Automated Integration Tests...\n');
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    try {
      fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  // 1. Cryptography Tests
  console.log('--- 1. Cryptographic Invariants & Ledger Tests ---');

  test('Canonical JSON serialization produces alphabetically sorted keys', () => {
    const objA = { z: 1, a: 'test', m: { y: 2, b: 3 } };
    const objB = { a: 'test', m: { b: 3, y: 2 }, z: 1 };
    assert.strictEqual(canonicalJson(objA), canonicalJson(objB));
    assert.strictEqual(canonicalJson(objA), '{"a":"test","m":{"b":3,"y":2},"z":1}');
  });

  test('SHA-256 hash chaining links correctly to Genesis Anchor', () => {
    const payload = { loanId: 'LN-1001', originalPrincipal: 350000 };
    const hash = computeChainedRecordHash(payload, null);
    assert.strictEqual(typeof hash, 'string');
    assert.strictEqual(hash.length, 64);

    // Chaining second block to first block hash
    const payload2 = { loanId: 'LN-1002', originalPrincipal: 280000 };
    const hash2 = computeChainedRecordHash(payload2, hash);
    assert.notStrictEqual(hash, hash2);
  });

  test('Merkle Root computation generates consistent 32-byte hex root', () => {
    const hashes = [
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      'ca978112ca1bbdcaf064278e4a1f2c37214a3956ff719147d53001913747e88c',
      '4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce'
    ];
    const root = computeMerkleRoot(hashes);
    assert.strictEqual(typeof root, 'string');
    assert.strictEqual(root.length, 64);
  });

  test('Tamper detection accurately catches modified loan payloads', () => {
    const loans = [
      { id: '1', loanId: 'LN-1', borrowerName: 'Alice', originalPrincipal: 100000, currentBalance: 95000, interestRate: 5.5, termMonths: 360, borrowerState: 'CA', paymentStatus: 'CURRENT', daysPastDue: 0, documentStatus: 'COMPLETE', createdAt: new Date('2024-01-01') },
      { id: '2', loanId: 'LN-2', borrowerName: 'Bob', originalPrincipal: 200000, currentBalance: 190000, interestRate: 6.0, termMonths: 360, borrowerState: 'TX', paymentStatus: 'CURRENT', daysPastDue: 0, documentStatus: 'COMPLETE', createdAt: new Date('2024-01-02') }
    ];

    const hash1 = computeChainedRecordHash(extractCanonicalLoanPayload(loans[0]), GENESIS_HASH);
    const hash2 = computeChainedRecordHash(extractCanonicalLoanPayload(loans[1]), hash1);

    const verifiedChain = [
      { ...loans[0], recordHash: hash1, previousRecordHash: GENESIS_HASH },
      { ...loans[1], recordHash: hash2, previousRecordHash: hash1 }
    ];

    // Valid chain test
    const validResult = verifyChainIntegrity(verifiedChain);
    assert.strictEqual(validResult.isValid, true);

    // Tampered chain test (mutating balance of record 1 without updating recordHash)
    const tamperedChain = [
      { ...loans[0], originalPrincipal: 999999, recordHash: hash1, previousRecordHash: GENESIS_HASH },
      { ...loans[1], recordHash: hash2, previousRecordHash: hash1 }
    ];
    const tamperedResult = verifyChainIntegrity(tamperedChain);
    assert.strictEqual(tamperedResult.isValid, false);
    assert.strictEqual(tamperedResult.brokenLoanId, 'LN-1');
  });

  // 2. Smart CSV Auto-Mapper Tests
  console.log('\n--- 2. Ingestion & Header Auto-Mapper Tests ---');

  test('Header Auto-Mapper normalizes non-standard banking column aliases', () => {
    const rawRow = {
      'LOAN_AMT': '350000',
      'int_rate': '6.25',
      'prop_state': 'CA',
      'pmt_status': 'CURRENT',
      'DPD': '0',
      'loan_term': '360',
      'borrower_full_name': 'Alice Johnson'
    };

    const normalized = IngestionService.normalizeRowHeaders(rawRow);
    assert.strictEqual(normalized.original_principal, '350000');
    assert.strictEqual(normalized.interest_rate, '6.25');
    assert.strictEqual(normalized.borrower_state, 'CA');
    assert.strictEqual(normalized.payment_status, 'CURRENT');
    assert.strictEqual(normalized.days_past_due, '0');
    assert.strictEqual(normalized.term_months, '360');
    assert.strictEqual(normalized.borrower_name, 'Alice Johnson');
  });

  // 3. Domain Validation Rules Tests
  console.log('\n--- 3. Domain Validation Rules & Financial Math Tests ---');

  test('Mathematical Amortization Validator flags balance exceeding principal', () => {
    const invalidLoan = {
      loanId: 'LN-TEST-1',
      originalPrincipal: 280000,
      currentBalance: 295000, // Exceeds original principal!
      interestRate: 5.85,
      termMonths: 360,
      originationDate: new Date('2023-01-01')
    };

    const issues = ValidationService.validateLoanRecord(invalidLoan, [], DEFAULT_VALIDATION_RULES);
    const balanceIssue = issues.find(i => i.field === 'current_balance' || i.field === 'currentBalance');
    assert.ok(balanceIssue, 'Should flag invalid balance exceeding original principal');
  });

  test('State code validator flags invalid US state abbreviations', () => {
    const invalidStateLoan = {
      loanId: 'LN-TEST-2',
      originalPrincipal: 300000,
      currentBalance: 290000,
      borrowerState: 'CALIFORNIA' // Should be 2-letter 'CA'
    };

    const issues = ValidationService.validateLoanRecord(invalidStateLoan, [], DEFAULT_VALIDATION_RULES);
    const stateIssue = issues.find(i => i.field === 'borrower_state' || i.field === 'borrowerState');
    assert.ok(stateIssue, 'Should flag non-2-letter state code');
  });

  test('Stale Record Detector flags feeds older than 180 days', () => {
    const staleLoan = {
      loanId: 'LN-TEST-3',
      originalPrincipal: 250000,
      currentBalance: 240000,
      lastUpdatedAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000) // 200 days old
    };

    const issues = ValidationService.validateLoanRecord(staleLoan, [], DEFAULT_VALIDATION_RULES);
    const staleIssue = issues.find(i => i.field === 'last_updated_at' || i.field === 'lastUpdatedAt');
    assert.ok(staleIssue, 'Should flag stale record older than 180 days');
  });

  test('Closed Loan rule flags positive balance on closed/paid-off loans', () => {
    const closedWithBalanceLoan = {
      loanId: 'LN-TEST-4',
      originalPrincipal: 220000,
      currentBalance: 15000, // Positive balance on CLOSED loan!
      paymentStatus: 'CLOSED'
    };

    const issues = ValidationService.validateLoanRecord(closedWithBalanceLoan, [], DEFAULT_VALIDATION_RULES);
    const closedIssue = issues.find(i => i.field === 'current_balance' || i.field === 'currentBalance');
    assert.ok(closedIssue, 'Should flag positive balance on closed loan');
  });

  test('Status vs DPD Consistency rule flags mismatched delinquency', () => {
    const inconsistentLoan = {
      loanId: 'LN-TEST-5',
      originalPrincipal: 300000,
      currentBalance: 290000,
      paymentStatus: 'CURRENT',
      daysPastDue: 45 // Inconsistent: status is CURRENT but 45 days past due!
    };

    const issues = ValidationService.validateLoanRecord(inconsistentLoan, [], DEFAULT_VALIDATION_RULES);
    const dpdIssue = issues.find(i => i.field === 'payment_status' || i.field === 'paymentStatus');
    assert.ok(dpdIssue, 'Should flag CURRENT status with 45 DPD');
  });

  test('Maturity date validator flags maturity date before origination', () => {
    const invalidDatesLoan = {
      loanId: 'LN-TEST-6',
      originationDate: new Date('2024-01-01'),
      maturityDate: new Date('2020-01-01') // Before origination!
    };

    const issues = ValidationService.validateLoanRecord(invalidDatesLoan, [], DEFAULT_VALIDATION_RULES);
    const dateIssue = issues.find(i => i.field === 'maturity_date' || i.field === 'maturityDate');
    assert.ok(dateIssue, 'Should flag maturity date before origination date');
  });

  test('Document availability rule flags missing vault documents', () => {
    const missingDocLoan = {
      loanId: 'LN-TEST-7',
      documentStatus: 'MISSING_NOTE'
    };

    const issues = ValidationService.validateLoanRecord(missingDocLoan, [], DEFAULT_VALIDATION_RULES);
    const docIssue = issues.find(i => i.field === 'document_status' || i.field === 'documentStatus');
    assert.ok(docIssue, 'Should flag missing vault promissory note');
  });

  console.log(`\n📊 Test Execution Summary: ${passed} Passed, ${failed} Failed\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test suite failure:', err);
  process.exit(1);
});
