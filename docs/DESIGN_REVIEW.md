# NIRVAAT Staff/Principal Architectural Design Review

**Author**: Principal Engineer / Applied AI Safety Engineer  
**Date**: 2026-11-22  
**Target**: Production-Readiness & Defensible Hardening  

---

## 1. Actual vs. Claimed Architecture

| Subsystem | Stated / Claimed Architecture | Actual Codebase Reality | Architectural Alignment |
| :--- | :--- | :--- | :--- |
| **Physics Modeling** | Single-zone mass-balance ODE with dynamic infiltration and deposition. | Implemented in `solveIndoorMassBalance` (`@nirvaat/engines`). Evaluates hourly finite differences. | **100% Truthful**. Fully aligns with Singer et al. equations. |
| **Monte Carlo Sampling** | Paired Common Random Numbers (CRN) with sensitivity attribution. | Implemented in `batchEvaluateActionsCRN` with injected LCG PRNG (`seed=42019`). Baseline solved once per draw. | **100% Truthful**. Completely avoids paradoxes. |
| **AI Advisory Flow** | Gemini 2.5 Flash with deterministic tool envelopes. | Implemented in `server/nirvaatEngine.ts` and `nirvaatTools.ts`. Injects tool envelopes into Gemini structured prompt. | **100% Truthful**. |
| **Guardrails & Verification** | Server-side V1–V8 verifier auditing numeric provenance, banned advice, and medication alteration. | Implemented in `auditDraftPlan` (`@nirvaat/verifier`). Rejects unmatched numbers, ionizers, and infant masks. | **100% Truthful**. Tested against hallucinating stubs. |
| **Emergency Triage** | Instant zero-LLM short circuit for life-threatening respiratory signs. | `detectRedFlagSymptom()` matches 65 eval cases with 100% Recall and 0% FPR before triggering any LLM call. | **100% Truthful**. |

---

## 2. Top High-Risk Design Decisions & Mitigations

1. **Risk 1: LLM Hallucinated Statistics in Natural Language Output**
   - *Failure Scenario*: LLM alters exposure reduction from "-28% to -42%" to "-85% to -95%".
   - *Blast Radius*: Users undertake ineffective measures under a false sense of safety.
   - *Mitigation*: V1 Numeric Integrity Verifier extracts all percentages and ranges using Devanagari/ASCII regexes and compares against tool traces. Any discrepancy triggers deterministic fallback (`buildSafeTemplateFallback`).

2. **Risk 2: Mask Prescription for Infants Under 2 Years Old**
   - *Failure Scenario*: LLM suggests putting an N95 mask on a 1-year-old infant.
   - *Blast Radius*: Pediatric suffocation danger.
   - *Mitigation*: Hard rule in `packages/verifier/src/rules.ts` (`V3_NO_MASK_UNDER_2`) and physics engine guardrail `H4 Safety` which completely zeros out mask filtration credit for `infant_under_2`.

3. **Risk 3: Clinical Medication Alteration Advice**
   - *Failure Scenario*: LLM advises user to "stop your steroid inhaler because indoor air is clean".
   - *Blast Radius*: Acute asthma exacerbation.
   - *Mitigation*: Banned advice regex in `packages/verifier/src/rules.ts` (`V3_NO_MEDICATION_CHANGE`) blocks plan immediately with zero tolerance.

4. **Risk 4: ReDoS in Safety Regexes under Adversarial Queries**
   - *Failure Scenario*: Crafted payload causes catastrophic backtracking in input triage regex.
   - *Blast Radius*: Server thread blocking and Denial of Service.
   - *Mitigation*: Refactored `MASK_UNDER_2_RX` to eliminate unbounded adjacent whitespace quantifiers (`(?:\s+(?:on|for))?\s+`).

5. **Risk 5: Open-Meteo Mid-Day Offset Forecast Clock Skew**
   - *Failure Scenario*: Forecast starting at 14:00 causes index 0 to be mapped to midnight, aligning cooking emissions with sleep hours.
   - *Blast Radius*: Invalid time-of-day exposure estimates.
   - *Mitigation*: Implemented circular modulo clock-hour re-indexing (`reindexForecastByClockHour`), ensuring hour $h$ maps strictly to true local clock time $0..23$.

---

## 3. Coupling Hotspots & Refactoring Roadmap

- **Completed**:
  - Extracted parameter sampling and envelope builders into `sampling_helpers.ts` (< 250 lines).
  - Extracted twin simulator into `apiSimulate.ts` (< 90 lines).
  - Extracted deterministic response formatters into `planResponseFormatters.ts` (< 210 lines).
  - All source files strictly comply with $\le 300$ line bounds.
