# NIRVAAT Risk-Ranked Engineering Backlog

**Priority Formula**: $\text{Priority} = \frac{\text{Impact} \times \text{Confidence}}{\text{Effort}}$  
*Note: S0 items (Safety / Security / Data Integrity) always execute first.*

---

## 1. Top Backlog Items & Priority Matrix

| ID | Parameter | File & Line | Description | Severity | Evidence | Est. Score Impact | Confidence | Effort | Priority Score | Status |
| :--- | :--- | :--- | :--- | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| **B-01** | Safety | `packages/verifier/src/rules.ts:25` | Eliminate polynomial backtracking (ReDoS) in `MASK_UNDER_2_RX`. | **S0** | Automated verification tests | +1.5 | 1.0 | S (1) | **1.50** | **CLOSED** (`7e9ab5f`) |
| **B-02** | Security | `.github/workflows/ci.yml:15-36` | Pin all GitHub CI actions to verified full-length commit SHAs. | **S0** | SonarCloud hotspot / GitHub action error | +2.0 | 1.0 | S (1) | **2.00** | **CLOSED** (`7e9ab5f`) |
| **B-03** | Code Quality | `packages/engines/src/impact_estimate.ts:1` | Deconstruct monolithic Monte Carlo file into modular sampling helpers (<300L). | **S1** | Line count audit (was 337L, now 281L) | +3.0 | 0.95 | M (2) | **1.42** | **CLOSED** (`83c43c8`) |
| **B-04** | Code Quality | `server/routes/apiPlan.ts:1` | Decouple simulation route into `apiSimulate.ts` and response formatting (<300L). | **S1** | Line count audit (was 347L, now 214L) | +2.5 | 0.95 | M (2) | **1.19** | **CLOSED** (`83c43c8`) |
| **B-05** | Code Quality | `packages/engines/src/impact_crn.ts:1` | Decouple CRN envelope creation into `sampling_helpers.ts` (<300L). | **S1** | Line count audit (was 310L, now 287L) | +2.5 | 0.95 | M (2) | **1.19** | **CLOSED** (`83c43c8`) |
| **B-06** | Code Quality | `server/nirvaatEngine.ts:1` | Extract fallback templates into `planResponseFormatters.ts` (<300L). | **S1** | Line count audit (was 308L, now 202L) | +2.0 | 0.95 | S (1) | **1.90** | **CLOSED** (`83c43c8`) |
| **B-07** | Security | `server/routes/apiHistory.ts:59` | Replace pseudorandom `Math.random` with cryptographically secure `crypto.randomUUID()`. | **S1** | SonarCloud security issue | +1.0 | 1.0 | S (1) | **1.00** | **CLOSED** (`3dd20de`) |
| **B-08** | Code Quality | `packages/engines/src/impact_estimate.ts:41` | Replace confusing bitwise truncations (`\|= 0`) with `Math.trunc()`. | **S2** | SonarCloud maintainability issue | +0.5 | 1.0 | S (1) | **0.50** | **CLOSED** (`3dd20de`) |
| **B-09** | Testing | `tests/engines_physics.test.ts:139` | Fix implicit any parameter typing in array reducer test helper. | **S2** | `tsc --noEmit` check | +0.5 | 1.0 | S (1) | **0.50** | **CLOSED** (`83c43c8`) |
| **B-10** | Docs & Hygiene | `README.md` | Fix KaTeX formatting bug (`\text{variance share}`) and ensure feature truthfulness. | **S3** | UI rendering audit | +0.5 | 1.0 | S (1) | **0.50** | **CLOSED** (`83c43c8`) |
