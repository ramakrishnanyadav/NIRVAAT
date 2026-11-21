# Changelog

All notable changes to the NIRVAAT project are documented in this file.

---

## [0.6.0] - Milestone M6: Maintainability, Clean Architecture & Monorepo Hygiene
### Added
- **Monorepo Workspaces (`pnpm-workspace.yaml`)**: Fully configured pnpm workspace managing `@nirvaat/contracts`, `@nirvaat/engines`, `@nirvaat/verifier`, and `@nirvaat/prompts` with `workspace:*` dependencies.
- **Decomposed React Frontend**: Split the monolithic 1,226-line `App.tsx` into modular feature folders (`src/routes/`, `src/features/today/`, `src/features/forecast/`, `src/features/household/`, `src/features/audit/`, `src/shared/`). No file in the repository exceeds 400 lines; no React component exceeds ~250 lines.
- **Single Source of Truth for Types**: Migrated all API requests, responses, and profile models to derive directly from `@nirvaat/contracts` via `z.infer`, eliminating duplicated interface declarations.
- **Typed Server Errors & Middleware**: Introduced `NirvaatError`, `ValidationError`, and centralized Express error handling middleware (`server/middleware/errorHandler.ts`).
- **Comprehensive Documentation & ADRs**:
  - `docs/ARCHITECTURE.md`: Complete system architecture and sequence diagrams.
  - `docs/adr/0001-neuro-symbolic-architecture.md`: Architectural decision on neuro-symbolic boundaries.
  - `docs/adr/0002-tool-only-numeric-provenance.md`: V1 numeric provenance verification decision.
  - `docs/adr/0003-monte-carlo-common-random-numbers.md`: Common Random Numbers (CRN) simulation decision.
  - `CONTRIBUTING.md`: Developer guidelines, constraints, and contribution workflow.

---

## [0.5.0] - Milestone M5: Performance, Time-Alignment & Monte Carlo Optimization
### Added
- **Clock-Hour Time Alignment**: Synchronized forecast data with Open-Meteo local clock hours (`hourly.time[0]`), properly aligning cooking, commuting, sleeping, and thermal inversion windows regardless of request hour.
- **Common Random Numbers (CRN)**: Replaced independent draws with correlated random sequences using `seedrandom`, eliminating paradoxical negative dose reductions on sealed homes.
- **Dynamic Variance Attribution**: Normalized Monte Carlo sensitivity drivers so that $\sum \text{variance\_share} = 100\%$.
- **High-Performance In-Memory Memoization**: Cached Monte Carlo simulations by parameter signature hash, delivering $<0.1\text{ms}$ latency for repeated queries.
- **Performance Benchmarking Suite (`scripts/benchmark.js`, `docs/PERFORMANCE.md`)**: Documented real p50/p95 latency metrics, achieving $<0.3\text{ms}$ deterministic engine evaluation.

---

## [0.4.0] - Milestone M4: Application Security & OWASP ASVS Hardening
### Added
- **OWASP ASVS L1–L2 Session Isolation**: Replaced global history arrays with signed anonymous cryptographic session cookies (`nirvaat_session`, `httpOnly`, `SameSite: Lax`, UUID v4). Users can only access their own session history.
- **Sliding-Window Rate Limiting**: Added per-IP and per-session sliding-window rate limiters with standard `Retry-After` headers and HTTP 429 responses.
- **Server-Side Quota & Concurrency Caps**: Implemented `MAX_CONCURRENT_GEMINI_CALLS = 3` and `DAILY_LLM_BUDGET = 250` to prevent denial-of-wallet attacks.
- **Strict Zod Input Validation**: Applied `.strict()` validation on all API endpoints (`/api/plan`, `/api/engines/plan`, `/api/engines/simulate`), rejecting unvalidated parameters.
- **Prompt Injection Defense**: Sanitized user queries and tool outputs in `@nirvaat/prompts`, neutralizing system prompt leaks and simulated audit passes.
- **STRIDE Threat Model (`docs/THREAT_MODEL.md`)**: Comprehensive security threat matrix across all six STRIDE categories.

---

## [0.3.0] - Milestone M3: Accessible Glass UI, Routing & Motion Controls
### Added
- **React Router HTML5 Navigation**: Replaced state-based tabs with declarative URL routes (`/today`, `/forecast`, `/household`, `/learn`, `/audit`, `/emergency`) with deep linking, back-button support, and `h1` focus restoration.
- **Zero-JS Emergency Route**: Ensured `/emergency` renders without animation dependencies for immediate accessibility during crisis.
- **In-App "Reduce Motion" Toggle**: Custom toggle overriding OS settings via Framer Motion's `MotionConfig reducedMotion="user"`, disabling orbs, parallax, and mesh drift when enabled.
- **WCAG 2.2 AA / AAA Contrast Hardening**: Tested and hardened all 13 text-on-glass pairs to exceed 4.5:1 contrast ratio against blurred backdrops, validated via automated script `pnpm run test:contrast`.
- **Tactile & Non-Color Indicators**: Augmented color-coded AQI badges with icons and textual confidence grades; added accessible data tables for hourly inversion and exposure charts.
- **Accessibility Report (`docs/ACCESSIBILITY.md`)**: Full accessibility audit covering landmarks, keyboard navigation, contrast, and screen readers.

---

## [0.2.0] - Milestone M2: Verifier, Safety Boundaries & Evaluator Pyramid
### Added
- **V1 Numeric Integrity Auditor**: Validates that all numeric claims in LLM responses correspond to physical engine envelopes.
- **Multilingual Red-Flag Triage Engine**: Implemented evaluated regex covering English, Hinglish, and Devanagari Hindi for acute respiratory symptoms with 100% recall.
- **Medication & Pediatric Safety Guardrails**:
  - Differentiates inhaled particle exposure reduction from clinical medication cessation.
  - Prohibits mask recommendations for infants under 2 years of age.
- **Comprehensive Evaluation Suite (`evals/redflags.json`, `tests/evals.test.ts`)**: 65 test cases evaluated with 100% recall and 0% false-positive rate on non-emergency queries.
- **CI Workflow (`.github/workflows/ci.yml`)**: Automated pipeline running linting, tests, contrast checks, and build on every push.

---

## [0.1.0] - Milestone M1: Contracts, Pure Engines & Mock Data
### Added
- **Contracts (`/packages/contracts`)**: Defined `ToolEnvelope`, `HouseholdProfile`, `RuntimeContext`, and `NirvaatPlan` TypeScript types, Zod schemas, and JSON Schema.
- **Cited Parameter Priors (`/packages/engines/src/priors.ts`)**: Versioned (`1.0.0`) prior table (`P`, `λ`, `k`, `S`, CADR derating, mask fit, EPA age-band inhalation rates) distinguishing cited vs assumed values.
- **Indoor Mass-Balance Engine (`/packages/engines/src/indoor_model.ts`)**: Pure analytical hourly solver for single-zone mass balance with optional two-zone exchange and DIY Corsi-Rosenthal filter modeling.
- **Inhaled Dose Engine (`/packages/engines/src/dose_model.ts`)**: Micro-environment dose accumulator (`home`, `commute`, `school`, `outdoors`) with strict `infant_under_2` mask block (`H4`).
- **Monte Carlo Impact & Scoring (`/packages/engines/src/impact_estimate.ts`, `scoring.ts`)**: Seeded 120-draw counterfactual engine returning median + `q10–q90` intervals, sensitivity drivers, and `(dose_avoided * feasibility) / cost` ranking with `H5` free-action guarantee.
