import fs from 'fs';
import path from 'path';
import { DEFAULT_VALIDATION_RULES } from '../config/defaultRules';

const DATA_DIR = path.join(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const FIRST_NAMES = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa', 'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley', 'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores'];
const STATES = ['CA', 'TX', 'FL', 'NY', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI', 'NJ', 'VA', 'WA', 'AZ', 'MA', 'TN', 'IN', 'MO', 'MD', 'WI', 'CO', 'MN', 'SC', 'AL', 'LA', 'KY', 'OR', 'OK', 'CT', 'UT', 'NV'];
const LOAN_TYPES = ['CONVENTIONAL', 'FHA', 'VA', 'JUMBO', 'USDA'];
const SERVICERS = ['Wells Fargo Servicing', 'PennyMac Loan Services', 'Chase Home Lending', 'Nationstar Mortgage', 'Freedom Mortgage', 'Rocket Mortgage Servicing'];
const INCOME_BANDS = ['$50k-$75k', '$75k-$100k', '$100k-$150k', '$150k+'];
const CREDIT_GRADES = ['A', 'B', 'C', 'D'];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateDatasets(totalLoans: number = 1000) {
  console.log(`🚀 Generating ${totalLoans} synthetic loan records with 15 intentional defect categories...`);

  const loanTapeRows: string[] = [
    'loan_id,borrower_id,borrower_name,loan_type,origination_date,maturity_date,original_principal,current_balance,interest_rate,term_months,borrower_state,loan_purpose,credit_grade,employment_length,income_band,payment_status,days_past_due,servicer_name,last_payment_date,last_updated_at,document_status,source_system'
  ];

  const servicerUpdateRows: string[] = [
    'loan_id,current_balance,payment_status,days_past_due,interest_rate,last_payment_date,servicer_name'
  ];

  const documentManifestRows: string[] = [
    'loan_id,document_status,vault_location,custodian_note'
  ];

  const expectedExceptions: string[] = [
    'loan_id,defect_type,severity,injected_field,description'
  ];

  for (let i = 1; i <= totalLoans; i++) {
    const loanNum = 1000 + i;
    const loanId = `LN-${loanNum}`;
    const borrowerId = `BW-${500 + i}`;
    const borrowerName = `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`;
    const loanType = randomChoice(LOAN_TYPES);
    const state = randomChoice(STATES);
    const servicer = randomChoice(SERVICERS);
    const income = randomChoice(INCOME_BANDS);
    const grade = randomChoice(CREDIT_GRADES);
    const term = 360;

    const origYear = randomInt(2021, 2023);
    const origMonth = String(randomInt(1, 12)).padStart(2, '0');
    const origDay = String(randomInt(1, 28)).padStart(2, '0');
    const origDate = `${origYear}-${origMonth}-${origDay}`;
    const matDate = `${origYear + 30}-${origMonth}-${origDay}`;

    const principal = randomInt(150, 650) * 1000;
    const rate = Number((randomInt(450, 785) / 100).toFixed(2));
    
    // Normal amortized balance
    const elapsedMonths = (2024 - origYear) * 12 + (8 - Number(origMonth));
    const monthlyRate = (rate / 100) / 12;
    const monthlyPmt = principal * (monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1);
    const amortizedBal = Math.round(principal * Math.pow(1 + monthlyRate, elapsedMonths) - monthlyPmt * (Math.pow(1 + monthlyRate, elapsedMonths) - 1) / monthlyRate);
    const currentBal = Math.max(10000, Math.min(principal, amortizedBal));

    let row = {
      loan_id: loanId,
      borrower_id: borrowerId,
      borrower_name: borrowerName,
      loan_type: loanType,
      origination_date: origDate,
      maturity_date: matDate,
      original_principal: String(principal),
      current_balance: String(currentBal),
      interest_rate: String(rate),
      term_months: String(term),
      borrower_state: state,
      loan_purpose: 'PURCHASE',
      credit_grade: grade,
      employment_length: `${randomInt(2, 12)} years`,
      income_band: income,
      payment_status: 'CURRENT',
      days_past_due: '0',
      servicer_name: servicer,
      last_payment_date: '2024-08-01',
      last_updated_at: '2024-08-15',
      document_status: 'COMPLETE',
      source_system: 'ORIGINATION_LOS'
    };

    // --- INJECT 15 SPECIFIC DEFECTS AT KNOWN INDEX TARGETS ---
    if (i === 10) {
      row.loan_id = '';
      expectedExceptions.push(`${loanId},REQUIRED_LOAN_ID,ERROR,loan_id,Missing required loan ID`);
    } else if (i === 20) {
      row.loan_id = 'LN-1010';
      expectedExceptions.push(`LN-1010,DUPLICATE_LOAN_ID,ERROR,loan_id,Duplicate loan ID matching LN-1010`);
    } else if (i === 30) {
      row.borrower_name = 'Alice Johnson';
      row.original_principal = '350000';
      row.origination_date = '2024-01-15';
      expectedExceptions.push(`${loanId},SUSPICIOUS_REPEAT_BORROWER,WARNING,borrower_name,Exact duplicate borrower name and principal amount`);
    } else if (i === 40) {
      row.origination_date = 'INVALID_DATE_FORMAT';
      expectedExceptions.push(`${loanId},INVALID_DATE_FORMAT,ERROR,origination_date,Unparseable date string`);
    } else if (i === 50) {
      row.maturity_date = '2019-01-01';
      expectedExceptions.push(`${loanId},MATURITY_BEFORE_ORIGINATION,ERROR,maturity_date,Maturity date is earlier than origination date`);
    } else if (i === 60) {
      row.original_principal = '-250000';
      expectedExceptions.push(`${loanId},NEGATIVE_PRINCIPAL,ERROR,original_principal,Original principal balance cannot be negative`);
    } else if (i === 70) {
      row.current_balance = String(principal + 45000);
      expectedExceptions.push(`${loanId},CURRENT_EXCEEDS_PRINCIPAL,ERROR,current_balance,Current balance exceeds original principal loan amount`);
    } else if (i === 80) {
      row.interest_rate = '650';
      expectedExceptions.push(`${loanId},RATE_OUT_OF_RANGE,ERROR,interest_rate,Interest rate 650% exceeds plausible 0.5%-30% range`);
    } else if (i === 90) {
      row.payment_status = 'CURRENT';
      row.days_past_due = '45';
      expectedExceptions.push(`${loanId},STATUS_DPD_INCONSISTENCY,ERROR,payment_status,Status is CURRENT but loan has 45 days past due`);
    } else if (i === 100) {
      row.document_status = 'MISSING_NOTE';
      expectedExceptions.push(`${loanId},MISSING_DOCUMENT_STATUS,WARNING,document_status,Required promissory note is missing`);
    } else if (i === 110) {
      row.last_updated_at = '2023-01-10';
      expectedExceptions.push(`${loanId},STALE_SERVICING_RECORD,WARNING,last_updated_at,Record has not been updated in over 180 days`);
    } else if (i === 120) {
      row.borrower_state = 'CALIFORNIA';
      expectedExceptions.push(`${loanId},INVALID_STATE_CODE,ERROR,borrower_state,Full state name instead of 2-letter postal code`);
    } else if (i === 130) {
      row.payment_status = 'CLOSED';
      row.current_balance = '32000';
      expectedExceptions.push(`${loanId},CLOSED_WITH_BALANCE,ERROR,current_balance,Loan marked CLOSED retains positive balance of $32,000`);
    } else if (i === 140) {
      row.current_balance = String(Math.round(principal * 0.98));
      expectedExceptions.push(`${loanId},AMORTIZATION_SCHEDULE_DEVIATION,ERROR,current_balance,Mathematical amortization drift >5%`);
    }

    loanTapeRows.push(Object.values(row).join(','));

    // Secondary Servicer Feed Generation (25% sample of loans)
    if (i % 4 === 0) {
      let servicerBal = currentBal;
      let servicerStatus = row.payment_status;
      let servicerDpd = Number(row.days_past_due);
      let servicerRate = Number(row.interest_rate);

      // Injected conflicts for testing /conflicts
      if (i === 160) {
        servicerBal = currentBal - 8500;
      } else if (i === 180) {
        servicerStatus = '30_DAYS_LATE';
        servicerDpd = 35;
      } else if (i === 200) {
        servicerRate = Number((rate + 0.5).toFixed(2));
      }

      servicerUpdateRows.push([
        loanId,
        servicerBal,
        servicerStatus,
        servicerDpd,
        servicerRate,
        '2024-08-10',
        servicer
      ].join(','));
    }

    // Document Manifest Generation
    let docStatus = 'COMPLETE';
    let vaultLoc = `VAULT-${String.fromCharCode(65 + (i % 6))}-${(i % 50) + 1}`;
    let custodianNote = 'Original promissory note and deed in vault inventory';

    if (i === 100 || i % 120 === 0) {
      docStatus = 'MISSING_NOTE';
      custodianNote = 'Promissory note missing endorsement allonge';
    }

    documentManifestRows.push([
      loanId,
      docStatus,
      vaultLoc,
      `"${custodianNote}"`
    ].join(','));
  }

  // Write CSV Files
  const loanTapePath = path.join(DATA_DIR, 'loan_tape.csv');
  const servicerUpdatePath = path.join(DATA_DIR, 'servicer_update.csv');
  const documentManifestPath = path.join(DATA_DIR, 'document_manifest.csv');
  const expectedExceptionsPath = path.join(DATA_DIR, 'expected_exception_sample.csv');
  const validationRulesPath = path.join(DATA_DIR, 'validation_rules.json');
  const usersPath = path.join(DATA_DIR, 'users.json');

  fs.writeFileSync(loanTapePath, loanTapeRows.join('\n'), 'utf-8');
  fs.writeFileSync(servicerUpdatePath, servicerUpdateRows.join('\n'), 'utf-8');
  fs.writeFileSync(documentManifestPath, documentManifestRows.join('\n'), 'utf-8');
  fs.writeFileSync(expectedExceptionsPath, expectedExceptions.join('\n'), 'utf-8');
  fs.writeFileSync(validationRulesPath, JSON.stringify(DEFAULT_VALIDATION_RULES, null, 2), 'utf-8');

  // Write users.json (Section 5 & 12 credentials)
  const usersData = [
    {
      role: 'DATA_OPERATOR',
      name: 'Elena Rostova',
      email: 'operator@intain.ai',
      department: 'Data Operations & LOS Normalization',
      permissions: ['INGEST_TAPES', 'VIEW_RAW_DATA', 'TRIGGER_VALIDATION']
    },
    {
      role: 'REVIEWER',
      name: 'Marcus Vance',
      email: 'reviewer@intain.ai',
      department: 'Credit Quality Control & Exception Resolution',
      permissions: ['RESOLVE_EXCEPTIONS', 'USE_AI_COPILOT', 'RECONCILE_CONFLICTS', 'OVERRIDE_FIELDS']
    },
    {
      role: 'DATA_CONSUMER',
      name: 'Sophia Chen',
      email: 'consumer@capitalmarkets.com',
      department: 'Secondary Market Capital & Audit Governance',
      permissions: ['VIEW_VERIFIED_LEDGER', 'INSPECT_BLOCKCHAIN', 'EXPORT_PROOFS', 'AUDIT_DOWNLOAD']
    }
  ];
  fs.writeFileSync(usersPath, JSON.stringify(usersData, null, 2), 'utf-8');

  console.log(`✅ Datasets successfully generated in: ${DATA_DIR}`);
  console.log(`   - loan_tape.csv: ${loanTapeRows.length - 1} loans`);
  console.log(`   - servicer_update.csv: ${servicerUpdateRows.length - 1} records`);
  console.log(`   - document_manifest.csv: ${documentManifestRows.length - 1} records`);
  console.log(`   - expected_exception_sample.csv: ${expectedExceptions.length - 1} test cases`);
  console.log(`   - validation_rules.json: ${DEFAULT_VALIDATION_RULES.length} rules`);
  console.log(`   - users.json: ${usersData.length} test personas`);
}

// Direct execution
if (require.main === module) {
  const count = process.argv[2] ? parseInt(process.argv[2], 10) : 1000;
  generateDatasets(count);
}
