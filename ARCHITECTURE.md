# 🏛️ Architecture Note: Intain Loan Data Verification Copilot

> **Intain Campus FinTech Challenge 2026 — 2-Page System Architecture & Design Specification**

---

## 1. System Overview & Core Philosophy

The **Intain Loan Data Verification Copilot** is a high-assurance financial data verification engine designed to ingest disparate, unstandardized loan tapes, detect data-quality defects, orchestrate human-AI exception resolution, and establish immutable cryptographic provenance across verified assets.

```
+--------------------------------------------------------------------------------------------------+
|                                  PRESENTATION & WORKFLOW LAYER                                   |
|   React 19 + TypeScript + Vite + Tailwind CSS + Lucide Icons + Recharts Visualization             |
|   Role Personas: [Data Operator]  |  [Credit Reviewer]  |  [Secondary Market Data Consumer]      |
+-----------------------------------+------------------------------+-------------------------------+
                                    | REST API Calls (Axios)       | Voice Commands (Web Speech)
                                    v                              v
+--------------------------------------------------------------------------------------------------+
|                                    BACKEND SERVICES & ENGINE                                     |
|                                Node.js + Express 5 + Prisma ORM                                  |
|                                                                                                  |
|   +--------------------------+   +---------------------------+   +---------------------------+   |
|   |   Ingestion & Auto-Map   |   |  Dynamic Validation Rules |   | Multi-Source Reconciler   |   |
|   |  - 50+ Banking Aliases   |   |  - 15 Section 7 Defects   |   |  - Servicer vs Tape Diff  |   |
|   |  - 21-Field Normalizer   |   |  - Compound Amortization  |   |  - Custodian Manifest     |   |
|   +--------------------------+   +---------------------------+   +---------------------------+   |
+-----------------------------------+------------------------------+-------------------------------+
                                    |                              |
                                    v                              v
+-----------------------------------+------+   +-------------------+-------------------------------+
|         AI VERIFICATION COPILOT          |   |           CRYPTOGRAPHIC TRUST LAYER               |
|      Google Gemini 2.5 Flash API         |   |  - Canonical JSON Serialization (Sorted Keys)     |
|  - Structured Root-Cause Explanations    |   |  - Sequential SHA-256 Parent Hash Chaining        |
|  - Chain-of-Thought Reasoning Steps      |   |  - Hierarchical Merkle Root Rollup                |
|  - Section 9 Zero-Silent-Change Guard    |   |  - O(n) Real-Time Tamper Diagnostic Traversal     |
|  - Deterministic Heuristics Fallback     |   +---------------------------------------------------+
+------------------------------------------+   |                     STORAGE                       |
                                               |     Prisma SQLite (Loans, Exceptions, Audits)     |
                                               +---------------------------------------------------+
```

---

## 2. End-to-End Ingestion & Verification Lifecycle

```
[Raw CSV Tape / Servicer Update / Document Manifest]
                         |
                         v
[Smart Header Auto-Mapper] -> Normalizes 50+ institutional bank column variations
                         |
                         v
[21-Field Schema Normalization] -> Safely casts types, parses dates, formats currencies
                         |
                         v
[Rules Validation Engine] -> Evaluates 15 domain rules (Amortization, DPD, Stale, Duplicates)
                         |
           +-------------+-------------+
           |                           |
  (No Defects Found)          (Defects Identified)
           |                           |
           v                           v
   [Status: PENDING]           [Status: EXCEPTIONS_FOUND]
           |                           |
           |                  [Exception Queue & AI Copilot]
           |                  - Gemini 2.5 Flash Diagnostic
           |                  - Step-by-Step Reasoning
           |                  - Voice-Command Resolution ("Accept" / "Reject")
           |                  - Inline Reviewer Field Overrides
           |                           |
           +<--------------------------+ (All Exceptions Cleared)
           |
           v
[Cryptographic Certification Gate] -> Computes SHA-256 Chained Hash & Updates Merkle Root
           |
           v
   [Status: VERIFIED] -> Appended to Immutable Cryptographic Ledger
```

---

## 3. Cryptographic Verification & Tamper Detection Model

To satisfy institutional audit standards without requiring full blockchain network latency, the copilot implements a **Deterministic Cryptographic Chain with Merkle Tree Aggregation**:

### A. Deterministic Canonical Serialization
To avoid serialization non-determinism across JavaScript runtime engines, every loan payload is recursively serialized into `canonicalJson`:
* Object keys sorted alphabetically.
* Numeric floating values formatted to uniform decimal bounds.
* Null and undefined values standardized.

### B. Sequential Hash Chaining
Each verified loan record $i$ computes a SHA-256 record hash $H_i$ incorporating the canonical payload $L_i$ and the parent record's hash $H_{i-1}$:
$$H_0 = \text{0000000000000000000000000000000000000000000000000000000000000000} \quad (\text{Genesis Anchor})$$
$$H_i = \text{SHA256}\left(\text{canonicalJson}(L_i) \parallel \text{"|PREV:"} \parallel H_{i-1}\right)$$

### C. Merkle Tree Root Rollup
All verified record hashes $[H_1, H_2, \dots, H_n]$ are aggregated into a cumulative Merkle Root $R$:
$$R = \text{computeMerkleRoot}([H_1, H_2, \dots, H_n])$$

### D. Real-Time Tamper Diagnostic Traversal
If a database record or field is maliciously mutated in the database without re-executing the certified verification signing key, the system's `verifyChainIntegrity` traversal detects the break in $O(n)$ time, pinpointing:
* Exact corrupted `loanId`.
* Stored hash vs. mathematically expected chained hash.
* Breakdown timestamp and invalid Merkle sub-tree.

---

## 4. Section 9 AI Safety & Human Governance Controls

In accordance with Section 9 of the Intain FinTech specification:
1. **Zero Silent Changes**: The AI Copilot is purely advisory. No database field is modified automatically without explicit human authorization (`ACCEPT_AI`, `REJECT_AI`, or `MANUAL_EDIT`).
2. **Reverse Traceability**: AI suggestions, grounding prompts, model identifiers (`gemini-2.5-flash`), response latency in ms, and confidence scores are logged into the immutable `AuditLog` table.
3. **Full Prompt Transparency**: Reviewers can toggle the **"Inspect AI Prompt & Payload"** drawer to view the exact grounding prompt sent to the LLM.
4. **Resilient Fallback**: If offline or during air-gapped evaluation, the AI engine transparently switches to deterministic heuristic rule models.

---

## 5. Design Trade-Offs & Architectural Decisions

| Decision | Chosen Approach | Alternative Considered | Rationale |
| :--- | :--- | :--- | :--- |
| **Database** | Prisma + SQLite | PostgreSQL / MongoDB | Zero-configuration local execution for hackathon judges; single file portability without external service dependencies. |
| **AI Integration** | Google Gemini 2.5 Flash SDK | LangChain / Local Ollama | Ultra-low latency (<600ms), native JSON structured output, zero external Python server required. |
| **Voice Copilot** | Browser-Native Web Speech API | Whisper API / Cloud STT | Zero network audio overhead, instant client-side transcription, zero latency speech execution. |
| **Cryptographic Model** | SHA-256 Chained Hash + Merkle Trees | Ethereum Smart Contract | Instant execution, 0 gas fees, complete tamper-proof verification for institutional securitization tapes. |
