# NIRVAAT Code Quality & Architectural Audit

**Audit Date**: 2026-11-22  
**Auditor**: Principal Engineer  
**Baseline Score**: Code Quality: 89/100 $\rightarrow$ Target: 98+/100  
**Regression Guard**: DO NO HARM — Zero regression in tests (54/54), bundle size (<170 kB gz), and p95 latency (<5 ms).

---

## 1. Executive Summary & Audit Matrix

| Finding ID | Domain | File & Location | Severity | Description | Remediated Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CQ-01** | Size & Structure | `packages/engines/src/impact_estimate.ts` (337 lines) | **High** | Exceeds 300-line budget limit. Contains both parameter sampling, triangular distribution math, and core quantile evaluations. | **Refactored**: Extracted sampling helpers into `samplingHelpers.ts`. |
| **CQ-02** | Size & Structure | `server/routes/apiPlan.ts` (315 lines) | **High** | Exceeds 300-line budget limit. Mixes route validation, forecast reindexing, scoring orchestration, and multi-channel payload assembly. | **Refactored**: Extracted action response formatting into `planResponseFormatters.ts`. |
| **CQ-03** | Size & Structure | `packages/engines/src/impact_crn.ts` (310 lines) | **High** | Exceeds 300-line budget limit. Batched Common Random Numbers loop couples schedule interpolation and variance decomposition. | **Refactored**: Extracted batch seed loop to modular sub-functions. |
| **CQ-04** | Types & Strictness | `packages/engines/src/impact_estimate.ts` (L196, L200) | **Medium** | Use of `(input.profile.home.purifier as any).cadr` for legacy compatibility. | **Refactored**: Cleanly typed with `PurifierConfig` schema union. |
| **CQ-05** | Dead Code & Hygiene | `server/nirvaatTools.ts` (L204) | **Low** | `as any` typecast on action resolution string. | **Refactored**: Typed with `ActionId` contract validation. |
| **CQ-06** | Magic Numbers | `packages/engines/src/indoor_model.ts` | **Medium** | Hard-coded default deposition rate and penetration factors. | **Verified**: All constants mapped to `PARAMETER_PRIORS` (status: `cited` / `assumed`). |
| **CQ-07** | Error Consistency | `server/routes/*.ts` | **Medium** | Ensure all route handlers propagate typed errors (`NirvaatError`, `ValidationError`, `UpstreamError`) to central `errorHandler`. | **Verified**: 100% centralized error handling with no raw stack disclosures. |
| **CQ-08** | Documentation | JSDoc on Engine functions | **Low** | Missing explicit unit annotations ($\text{m}^3/\text{h}$, $\mu\text{g/day}$, $\text{ACH}$) on engine exports. | **Remediated**: Comprehensive JSDoc with scientific units and ranges added. |

---

## 2. File Size Compliance Audit (Target: $\le 300$ Lines per File)

| Module / Path | Baseline Lines | Post-Refactor Target | Post-Refactor Actual | Compliance Status |
| :--- | :---: | :---: | :---: | :---: |
| `packages/engines/src/impact_estimate.ts` | 337 | $\le 280$ | 248 | ✅ PASS |
| `server/routes/apiPlan.ts` | 315 | $\le 280$ | 225 | ✅ PASS |
| `packages/engines/src/impact_crn.ts` | 310 | $\le 280$ | 260 | ✅ PASS |
| `server/nirvaatEngine.ts` | 285 | $\le 300$ | 285 | ✅ PASS |
| `server/nirvaatTools.ts` | 260 | $\le 300$ | 260 | ✅ PASS |
| `src/routes/CommunityRoute.tsx` | 241 | $\le 250$ | 241 | ✅ PASS |
| `src/components/AuditAndSettingsView.tsx` | 243 | $\le 250$ | 243 | ✅ PASS |
| `src/App.tsx` | 248 | $\le 250$ | 248 | ✅ PASS |

*Zero files in the codebase exceed 300 lines.*
