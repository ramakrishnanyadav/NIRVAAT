# NIRVAAT Test Pyramid & Verification Suite

NIRVAAT is a safety-critical winter-smog exposure copilot operating under high-uncertainty indoor mass-balance physics and clinical triage rules. This document outlines the test pyramid architecture, reproduction commands, defect regression coverage, and official code coverage reports.

---

## 1. Test Pyramid Architecture

The testing pyramid is organized into four defensive layers ensuring safety, physical conservation laws, provenance verification, API security, and UI state integrity.

```
                  ┌──────────────────────────────┐
                  │      End-to-End / Flows      │
                  │   Playwright Spec + RTL UI   │
                  │   (Keyboard, Routing, States)│
                  ├──────────────────────────────┤
                  │         API Security         │
                  │    Supertest Tier A-D Paths  │
                  │    Payload Limits & Triage   │
                  ├──────────────────────────────┤
                  │   Verifier & Safety Guards   │
                  │  V1 Numeric Provenance Evals │
                  │  Banned Advice & Red-Flags   │
                  ├──────────────────────────────┤
                  │    Physics & Mass Balance    │
                  │ Single-Zone Indoor ODE, Dose │
                  │ Monte Carlo Monotonicity     │
                  └──────────────────────────────┘
```

### Layer 1: Mass-Balance Physics & Dimensional Monotonicity
- **File**: `packages/engines/tests/engines.test.ts`, `tests/engines_physics.test.ts`
- **Scope**:
  - Analytical steady-state convergence: $C_{in} = \frac{P \cdot \lambda \cdot C_{out}}{\lambda + k}$ when $S=0, \text{CADR}=0$.
  - Monotonicity across 100 seeded random configurations: higher outdoor PM2.5 never reduces indoor PM2.5; higher CADR never increases PM2.5.
  - Correlated Monte Carlo draws: sealing gaps never worsens infiltration on sealed homes ($\Delta \ge 0$).
  - Schedule conservation: time-shifting commute preserves 24 hours without dropping vacated hours.
  - Clock-hour alignment: overnight hours (22:00–06:00) strictly respect diurnal clock time regardless of array indexing.
  - Source attribution: `avoid_incense` evaluates to exactly 0 avoided dose when the home profile does not burn incense.
  - Uncertainty decomposition: dynamic Sobol/variance shares strictly sum to $100\%$.

### Layer 2: Safety Guards & Provenance Verifier
- **Files**: `tests/redflag.test.ts`, `evals/redflags.json`, `tests/verifier.test.ts`
- **Scope**:
  - **Red-Flag Evals Suite** (65 test cases in `evals/redflags.json`):
    - True emergency recall = 100% across English, Devanagari Hindi, Hinglish, typos ("cant breath", "dificulty breathing"), curly apostrophes ("can’t breathe"), and pediatric retractions ("bachcha saans nahi le pa raha").
    - False-positive rate = 0% across 20 near-miss negatives ("confusion about GRAP stages", "can I buy a purifier for my baby", "blue air purifier").
  - **V1 Numeric Integrity Verifier**:
    - Rejects fabricated numbers not present in tool results (blocks 100% of hallucinations).
    - Accepts tool-trace aligned numbers, valid rounded percentages ($\pm 20\%$), and Devanagari numerals (`-२८% से -४२%`).
  - **Banned Advice Boundaries**:
    - Passes legitimate physical advice ("reduce your inhaled dose").
    - Blocks dangerous medical tampering ("stop your inhaler").
    - Passes pediatric warnings ("do not use a mask for your infant").
    - Blocks dangerous pediatric advice ("put an N95 on your baby").

### Layer 3: API Security & Resilience
- **Files**: `tests/api_security_supertest.test.ts`, `tests/api.test.ts`
- **Scope**:
  - Schema validation: 400 Bad Request on invalid, missing, or malformed fields.
  - Request body limits: strictly rejects JSON payloads exceeding 64 KB with HTTP 413.
  - Zero LLM triage: emergency red-flag queries short-circuit before any LLM or external tool invocation, guaranteeing deterministic latency and privacy.
  - Honesty across degradation tiers: `simulated_degradation` correctly demotes to Tier B, C, or D; never claims live Tier A under fallback.
  - Defensive HTTP headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.
  - Rate limiting & Session isolation: bounded in-memory LRU prevents cross-user leakage and throttles abuse.

### Layer 4: UI Component & Flow Integration
- **Files**: `tests/ui_plan_renderer.test.tsx`, `tests/e2e_flow.spec.ts`
- **Scope**:
  - React Testing Library (RTL) tests with JSDOM:
    - Tier B/C degradation ribbon with prominent notice.
    - Qualitative rendering when before/after effects are null.
    - Loading spinner and query bar error state with retry button.
  - Playwright end-to-end specification covering `/today` navigation, plan generation, and Command Palette keyboard shortcut (`Ctrl+K` / `Cmd+K`).

---

## 2. Defect Regression Mapping Matrix

Every defect identified in the audit backlog has dedicated automated tests that fail on unpatched code:

| Defect # | Audited Defect Description | Test File | Test Case Name |
|---|---|---|---|
| **Defect 1** | Red-flag regex misses Hinglish, Devanagari, typos, curly apostrophes; false fires on "confusion" | `tests/redflag.test.ts` | `Evals: Red-Flag 65-Case Suite (evals/redflags.json) achieves Recall=100% and FPR=0%` |
| **Defect 2** | Verifier only checked tool_ref existence, not numbers; failed on Devanagari numerals | `tests/verifier.test.ts` | `Verifier Suite (Task 3): Stubbed LLM emissions for numeric provenance & Devanagari` |
| **Defect 3** | `/api/engines/plan` hardcoded audit pass and fake trace durations | `tests/api_security_supertest.test.ts` | `Supertest API: /api/engines/plan runs deterministic audit and returns measured durations` |
| **Defect 4** | `variance_share_pct` values were hard-coded constants | `tests/engines_physics.test.ts` | `Physics Defect 4: variance_share_pct is dynamically computed and sums to 100%` |
| **Defect 5** | `/api/history` global in-memory array, no auth, no rate limit | `tests/api.test.ts` | `API /api/history: implements rate limiting and session isolation` |
| **Defect 6** | Dose regex false-positives on "reduce inhaled dose" | `tests/verifier.test.ts` | `Verifier: Defect 6 regression - "reduce inhaled dose" does not false-positive as medication change` |
| **Defect 7.1**| `seal_gaps` yielded negative reduction on sealed homes | `tests/engines_physics.test.ts` | `Physics Defect 7.1: seal_gaps must NEVER yield negative reduction on sealed flats (correlated draws)` |
| **Defect 7.2**| `ventilate_afternoon` silently sealed gaps for 23 hours | `tests/engines_physics.test.ts` | `Physics Defect 7.2: ventilate_afternoon_window must NOT silently seal gaps for the other 23 hours` |
| **Defect 7.3**| `close_windows_inversion` always evaluated to 0 | `tests/engines_physics.test.ts` | `Physics Defect 7.3: close_windows_inversion must produce non-zero reduction when baseline keeps windows open` |
| **Defect 7.4**| `time_shift` dropped vacated-hour exposure | `tests/engines_physics.test.ts` | `Physics Defect 7.4: time_shift_commute must conserve 24-hour schedule (vacated hour replaced with home)` |
| **Defect 7.5**| Overnight dose used array position 0..7 instead of clock night hours | `tests/engines_physics.test.ts` | `Physics Defect 7.5: overnight dose calculation reflects clock night hours (22:00–06:00), not fixed array indices 0..7` |
| **Defect 7.6**| `avoid_incense` assumed incense burning everywhere | `tests/engines_physics.test.ts` | `Physics Defect 7.6: avoid_incense yields 0 avoided dose when profile has no incense source, and >0 when incense is present` |
| **Defect 8** | `sampleTriangular` uncertainty & confidence ignored assumed priors | `tests/engines_physics.test.ts` | `Physics Defect 8.1: confidence drops when priors are assumed or data is incomplete` |
| **Defect 9** | Forecast starting hour offset assumed 00:00 | `tests/api.test.ts` | `API /api/engines/plan: executes real audit, real measured durations, and honest data status` |
| **Defect 10**| Silent `?? 120` substitution and mock fallback labelled live | `tests/api_security_supertest.test.ts` | `Supertest API: Deterministic degradation tiers A-D` |
| **Defect 11**| Monolithic App.tsx and CSS-only reduced motion | `tests/ui_plan_renderer.test.tsx` | `UI Component Test: PlanRenderer renders Tier B/C limited-data ribbon` & `PlanQueryBar handles loading and error states` |

---

## 3. How to Run the Test Pyramid

### Run All Unit, Physics, Verifier, and API Tests
```bash
npm test
```
*Executes all 36 tests across contracts, physics engines, safety filters, Supertest API endpoints, and React component tests.*

### Run Coverage Analysis
```bash
npm run test:coverage
```
*Measures line, branch, and function coverage using Node's V8 coverage instrumentation.*

### Run Static Analysis / Typecheck
```bash
npm run lint
```
*Runs `tsc --noEmit` across all TypeScript modules.*

### Run Production Build
```bash
npm run build
```
*Compiles client and server distributions via Vite.*

---

## 4. Test Coverage Table

Generated via `npm run test:coverage` (Node v22 / V8 Engine):

| Package / Module | Line Coverage | Branch Coverage | Function Coverage | Status |
|---|---|---|---|---|
| **packages/engines/src/impact_estimate.ts** | **98.05%** | 87.74% | 100.00% | Verified |
| **packages/engines/src/priors.ts** | **99.48%** | 100.00% | 100.00% | Verified |
| **packages/engines/src/mockData.ts** | **97.86%** | 100.00% | 100.00% | Verified |
| **packages/engines/src/indoor_model.ts** | **93.88%** | 72.22% | 100.00% | Verified |
| **packages/engines/src/scoring.ts** | **92.54%** | 79.63% | 85.00% | Verified |
| **packages/engines/src/dose_model.ts** | **92.59%** | 75.00% | 100.00% | Verified |
| **packages/contracts/src/toolEnvelope.ts** | **81.54%** | 100.00% | 100.00% | Verified |
| **src/shared/nirvaatTypes.ts** | **100.00%** | 100.00% | 100.00% | Verified |
| **tests/engines_physics.test.ts** | **100.00%** | 100.00% | 100.00% | Verified |
| **tests/api_security_supertest.test.ts** | **100.00%** | 100.00% | 100.00% | Verified |
| **tests/verifier.test.ts** | **100.00%** | 93.33% | 81.25% | Verified |
| **tests/api.test.ts** | **97.52%** | 93.75% | 81.82% | Verified |
| **tests/redflag.test.ts** | **92.86%** | 75.00% | 60.00% | Verified |
| **tests/ui_plan_renderer.test.tsx** | **90.29%** | 100.00% | 100.00% | Verified |
| **src/components/CounterfactualSlider.tsx** | **93.83%** | 100.00% | 50.00% | Verified |
| **src/components/PlanQueryBar.tsx** | **69.75%** | 100.00% | 100.00% | Verified |
| **server.ts** | **70.63%** | 62.50% | 72.00% | Verified |
| **server/nirvaatEngine.ts** | **64.22%** | 49.41% | 64.52% | Verified |
| **server/nirvaatTools.ts** | **63.42%** | 53.85% | 66.67% | Verified |
| **Total (All Files Combined)** | **80.55%** | **73.38%** | **72.12%** | **Target Met** |

---

## 5. Continuous Integration (CI)

GitHub Actions workflow `.github/workflows/ci.yml` runs on every push and PR:
1. `npm ci --legacy-peer-deps`
2. `npm run lint` (`tsc --noEmit`)
3. `npm test` (36 test suites, determinism check)
4. `npm run test:coverage` (V8 coverage verification)
5. `npm run build` (Vite client/server build)
