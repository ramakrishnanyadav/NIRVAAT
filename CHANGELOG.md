# Changelog

## [0.1.0] - Milestone M1: Contracts, Pure Engines & Mock Data
### Added
- **Contracts (`/packages/contracts`)**: Defined `ToolEnvelope` (`{call_id, ok, value, unit, range, confidence, source, as_of, notes}`), `HouseholdProfile`, `RuntimeContext`, and `NirvaatPlan` TypeScript types, Zod schemas, and JSON Schema.
- **Cited Parameter Priors (`/packages/engines/src/priors.ts`)**: Versioned (`1.0.0`) prior table (`P`, `λ`, `k`, `S`, CADR derating, mask fit, EPA age-band inhalation rates) distinguishing cited vs assumed values.
- **Indoor Mass-Balance Engine (`/packages/engines/src/indoor_model.ts`)**: Pure analytical hourly solver for `dC_in/dt = P*lambda*C_out + S/V - (lambda + k + CADR_eff/V)*C_in` with optional two-zone exchange and DIY Corsi-Rosenthal filter modeling.
- **Inhaled Dose Engine (`/packages/engines/src/dose_model.ts`)**: Micro-environment dose accumulator (`home`, `commute`, `school`, `outdoors`) with strict `infant_under_2` mask block (`H4`).
- **Monte Carlo Impact & Scoring (`/packages/engines/src/impact_estimate.ts`, `scoring.ts`)**: Seeded 120-draw counterfactual engine returning median + `q10–q90` intervals, sensitivity drivers, and `(dose_avoided * feasibility) / cost` ranking with `H5` free-action guarantee.
- **Mock Scenarios & Property Tests (`/packages/engines/src/mockData.ts`, `tests/engines.test.ts`)**: Delhi NCR 24h winter-inversion profile, 3 worked scenarios (`leaky_1bhk_toddler`, `sealed_flat_purifier`, `outdoor_worker`), steady-state convergence test, and 100-iteration property tests.
