# Intain FinTech Campus Challenge 2026
# Agentic AI & Development Log

## 1. Executive Summary & Agentic Coding Overview
- **Development Tools Used:** Google Gemini 2.5 Flash (`@google/genai`), Claude Agentic Workflow, Cursor IDE, GitHub Copilot, Node.js + TypeScript + Prisma, React 19 + Vite.
- **Estimated AI-Generated Code:** ~75% generated / co-architected with Agentic AI; 25% human-engineered security controls, cryptographic invariants, and domain-specific refinements.
- **Human Review Process:** Every AI output was subjected to static type-checking (`tsc --noEmit`), unit boundary checks, cryptographic determinism verification (canonical JSON serialization), and strict compliance with the competition's 21-field loan tape specification.

---

## 2. Representative Prompt Engineering Evidence (10 Key Prompts)

### Prompt 1: Multi-Source Data Architecture & Schema Design
> *"Design a comprehensive SQLite Prisma schema for an immutable loan tape verification copilot. Must support 21 canonical loan-level fields (including DPD, payment_status, document_status, servicer_name), an append-only audit trail, open/resolved exception queues with AI explainability metadata (model, confidence, latency, reasoning steps), and cryptographic hash chain linkage (`recordHash`, `previousRecordHash`)."*

### Prompt 2: Cryptographic Chained Ledger & Merkle Root Invariants
> *"Write a TypeScript cryptographic utility that serializes loan records into deterministic canonical JSON (keys sorted alphabetically, consistent numeric precision). Implement SHA-256 hash chaining where each verified loan's hash incorporates the preceding record's hash (`SHA256(canonical + '|PREV:' + prevHash)`). Include a Merkle root generator and a full-chain integrity verifier that pinpoint the exact row if tampering occurs."*

### Prompt 3: Dynamic Configurable Validation Engine
> *"Implement a data-driven validation engine in TypeScript that executes rules defined in JSON rather than hardcoded if-statements. Must support range checks, balance integrity (`current_balance <= original_principal`), state code postal validation (US 50 states), status-to-DPD consistency, stale record detection (>180 days), and fuzzy duplicate detection."*

### Prompt 4: Fuzzy Duplicate & Repeat Borrower Detection
> *"Write a fuzzy matching algorithm using Levenshtein distance and token similarity in TypeScript. Detect suspicious repeat borrowers who share near-identical names (>85% string similarity), matching loan amounts, and close origination date windows (within 30 days), flagging them as potential fraud or data duplication anomalies."*

### Prompt 5: Second-Source Reconciliation & Conflict Resolution
> *"Build a reconciliation service that processes `servicer_update.csv` against existing loan tape records. Detect field discrepancies across `currentBalance`, `paymentStatus`, `daysPastDue`, and `interestRate`. Calculate confidence scores, provide domain-specific recommendations (e.g. servicer cash feed priority over origination tape), and log conflicts to the exception queue."*

### Prompt 6: Structured Explainable AI Assistant with Section 9 Controls
> *"Write an AIService using `@google/genai` (Gemini) that provides explainable analysis for loan tape validation failures. Output MUST strictly adhere to a JSON schema returning: explanation, suggested_value, confidence, step-by-step reasoning array, model_name, and prompt_version. Ensure AI output is purely advisory and never silently mutates records without human reviewer authorization."*

### Prompt 7: Natural Language to Dynamic Validation Rule Generator
> *"Build a FinTech rule architect prompt that takes natural language instructions (e.g. 'Flag loans where current balance > 800k and credit grade is D or F') and translates them into structured JSON validation rules compatible with our dynamic engine."*

### Prompt 8: Batch Exception Summarization Engine
> *"Create a prompt that ingests a batch of open exception summaries across a loan tape and synthesizes an executive summary for Data Consumers, highlighting defect density, top violating fields, and risk exposure."*

### Prompt 9: Live Demo Tamper Simulator & Verification UI
> *"Design a React UI page with a live 'Simulate DB Tampering' button that mutates a verified loan's database values without recalculating its cryptographic hash. Wire this to a live 'Verify Ledger Integrity' diagnostic card that displays the broken hash chain and exact corrupted record ID."*

### Prompt 10: Persona-Based Role Switcher & Composite Data Quality Score
> *"Implement a React role switcher context supporting Data Operator, QC Reviewer, and Data Consumer personas. Build a Composite Data-Quality Score (0-100) on the dashboard weighted by exception severity and multi-source conflict density."*

---

## 3. Explicit Examples of Rejected AI Output & Human Refinements

### Example 1: Insecure Direct Model Overwrites (Rejected AI Design)
- **What AI Suggested:** The AI's initial implementation of `generateAiAssist` immediately updated the `Loan` table with the predicted value upon calling the AI endpoint.
- **Why It Was Rejected:** Violates Section 9 AI Safety Controls ("AI output must not silently change data" and "Show AI recommendation separately from final human decision").
- **Human Engineering Correction:** Rewrote the flow to store the AI suggestion in the `Exception` record as provisional data (`suggestedValue`, `aiExplanation`, `aiConfidence`). Introduced explicit human reviewer actions (`ACCEPT_AI`, `REJECT_AI`, `MANUAL_EDIT`) with mandatory audit logging and reviewer comment capture.

### Example 2: Naive Exact String Matching for Duplicates (Rejected AI Logic)
- **What AI Suggested:** AI initially proposed checking for duplicates solely using `WHERE loan_id = current.loan_id`.
- **Why It Was Rejected:** Misses intentional competition anomalies such as repeat borrowers with slight typos (e.g. "Jon Doe" vs "John Doe") or transposed ID numbers.
- **Human Engineering Correction:** Developed `fuzzyMatch.ts` combining Levenshtein string distance with multi-attribute heuristics (name similarity >= 82% + matching principal amount + close origination date).

### Example 3: Non-Deterministic Object Hashing (Rejected AI Code)
- **What AI Suggested:** AI generated `JSON.stringify(loan)` directly before hashing with `crypto.createHash('sha256')`.
- **Why It Was Rejected:** Standard JavaScript `JSON.stringify` does not guarantee key ordering across different runtime environments or database query returns, which causes false-positive tamper alerts.
- **Human Engineering Correction:** Implemented a recursive `canonicalJson()` function that sorts keys alphabetically, strips undefined properties, and formats floating-point values to consistent decimal places.

### Example 4: Premature Delinquency Bucketing (Rejected AI Logic)
- **What AI Suggested:** AI's heuristic fallback categorized any loan with `days_past_due > 0` immediately into the `30_DAYS_LATE` delinquency bucket.
- **Why It Was Rejected:** Violates the Mortgage Bankers Association (MBA) standard method where 1 to 29 days past due constitutes a standard contractual grace period where the loan remains `CURRENT`.
- **Human Engineering Correction:** Calibrated the heuristic and validation rule so that $1 \le \text{DPD} < 30$ maps to `CURRENT` with an advisory notice, while $\text{DPD} \ge 30$ correctly transitions to `30_DAYS_LATE`.

### Example 5: TypeScript Verbatim Module Syntax Build Errors (Rejected AI Imports)
- **What AI Suggested:** Standard multi-import syntax `import { Component, ReactNode, ErrorInfo } from 'react';`
- **Why It Was Rejected:** Vite + TypeScript strict `verbatimModuleSyntax` flags type imports when imported alongside values, failing production CI compilation.
- **Human Engineering Correction:** Refactored into explicit type imports: `import { Component, type ReactNode, type ErrorInfo } from 'react';`.

---

## 4. Key Lessons Learned in Agentic Coding
1. **Agentic AI Excels at Rapid Prototyping & Boilerplate:** Accelerating API route definitions, TypeScript schemas, Tailwind components, and mock dataset creation by 5x–10x.
2. **Human Engineering Is Essential for Cryptographic Invariants:** Cryptographic chaining, tamper-proof state management, and strict schema validation require deterministic rigor that generative models cannot guarantee without human oversight.
3. **Structured Schemas Beat Free-Form Chat:** Enforcing strict JSON mime-types and typed Pydantic/Zod/TypeScript models on AI outputs eliminates parsing fragility and guarantees system reliability.
4. **Domain Regulatory Accuracy Requires Deep Verification:** Standard LLMs often conflate delinquency definitions; human domain expertise is critical for financial standard compliance (such as MBA delinquency buckets and compound amortization schedules).

