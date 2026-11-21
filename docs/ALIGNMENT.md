# NIRVAAT — Problem Statement Alignment & Traceability Matrix

This document maps every phrase and requirement of the NIRVAAT problem statement directly to verifiable software features, concrete source files/routes, and reproducible test or demo steps.

---

## The Problem Statement

> **"A GenAI-powered assistant that helps families and communities navigate severe winter smog and urban air pollution: suggests low-emission daily routines, indoor air-quality hacks, and sustainable alternatives tailored to location and lifestyle, while clearly explaining the direct impact of their choices."**

---

## 1. Traceability Matrix

| Problem Statement Phrase | Verifiable Product Feature | Source Files / Routes | Test / Demo Reproduction Step |
| :--- | :--- | :--- | :--- |
| **"GenAI-powered assistant"** | Neuro-symbolic copilot powered by server-side Google Gemini orchestration with conversational synthesis, multilingual translation (`hi-IN` / `en-IN`), structured JSON schemas, and deterministic fallback. | `server.ts`, `server/nirvaatEngine.ts`, `packages/prompts/src/systemInstructions.ts` | 1. Navigate to `/today`<br>2. Submit query in query bar<br>3. Verify model synthesis & Tier A/D plan returned.<br>4. Run `pnpm test` (asserts prompt injection & schema compliance). |
| **"helps families and communities"** | **Families**: Multi-generational household vulnerability profiling (infants, asthmatics, pregnant women, elders).<br>**Communities**: Dedicated `/community` view for RWAs & Schools with **strict $k$-anonymity ($\ge 5$ households minimum group size)** for differential privacy, collective dose avoidance (grams of PM2.5), morning school assembly shifts, zero-idling school zones, and explicit `[ROADMAP]` tagging for municipal sensor mesh / CPCB 311 integration. | `src/features/household/VulnerabilitySelector.tsx`, `src/routes/CommunityRoute.tsx`, `packages/contracts/src/profile.ts` | 1. Navigate to `/community`<br>2. Verify $k$-anonymity badge ($\ge 5$ households enforced)<br>3. Toggle RWA and School tabs to inspect collective impact (1.84g PM2.5 avoided) and roadmap items.<br>4. Run `pnpm test` (`tests/alignment.test.ts`). |
| **"navigate severe winter smog and urban air pollution"** | Thermal inversion timeline tracking nocturnal boundary layer stagnation; hourly cleanest-window detection (`cleanest_window` 12:00–16:00 vs `peak_window` 22:00–08:00); coarse 2-decimal Open-Meteo & CAMS live grid integration. | `packages/engines/src/indoor_model.ts`, `server/openMeteoClient.ts`, `src/components/InversionTimeline.tsx` | 1. Navigate to `/forecast`<br>2. Observe Inversion Timeline slider highlighting cleanest afternoon dip (12:00–16:00)<br>3. Run `tests/engines_physics.test.ts` (verifies clock-hour alignment). |
| **"suggests low-emission daily routines"** | Shift outdoor trips & errands to the afternoon dispersion window (`time_shift_commute`); close exterior windows during nighttime thermal inversions (`close_windows_inversion`); ventilate briefly during the afternoon dip (`ventilate_afternoon_window`). | `packages/engines/src/action_library.ts`, `packages/engines/src/scoring.ts`, `src/features/today/ActionCard.tsx` | 1. Click preset *"Outdoor Rider (6h Shift)"* on `/today`<br>2. Observe Action 1: "Shift outdoor trip to afternoon window" with 08:00–10:00 schedule conservation.<br>3. Run `tests/engines_physics.test.ts` (tests schedule conservation). |
| **"indoor air-quality hacks"** | Bedroom door & window weatherstripping (`seal_gaps`); DIY MERV-13 Corsi-Rosenthal box filter (`diy_filter`); kitchen door isolation and exhaust hood window cracking (`cook_with_hood_window`); pause indoor incense/dhoop/mosquito coils (`avoid_incense`). At least **1 free hack guaranteed per plan**. | `packages/engines/src/action_library.ts`, `packages/engines/src/indoor_model.ts`, `packages/engines/src/priors.ts` | 1. Click preset *"Leaky 1BHK + Toddler"* on `/today`<br>2. Observe free sealing & kitchen ventilation steps.<br>3. Run `tests/engines.test.ts` (verifies $\ge 1$ free action guarantee and Correlated Random Numbers). |
| **"sustainable alternatives"** | Systemic low-emission catalog with per-option impact, cost, evidence grade, and equity notes:<br>1. Public transit & metro over private cars/two-wheelers (-20% to -35% commute dose, -65% to -85% community emissions)<br>2. Work-From-Home (WFH) on inversion peaks (-30% to -50% daily dose, 0 transport emissions)<br>3. Induction/electric cooking over LPG/solid fuel (-40% to -70% indoor peak PM2.5)<br>4. Zero open biomass/waste burning (prevents acute >800 µg/m³ spikes)<br>5. RWA & School carpooling circles (-15% to -25% commute duration, -60% gate idling). | `packages/engines/src/sustainable_alternatives.ts`, `src/features/today/SustainableAlternativesSection.tsx` | 1. Scroll to *"Sustainable & Low-Emission Alternatives"* on `/today`<br>2. Filter by Clean Mobility, Clean Cooking, Zero Waste, and WFH.<br>3. Click "View Equity Note & Science Citation" on any option.<br>4. Run `tests/alignment.test.ts`. |
| **"tailored to location"** | Live geographic coordinates rounded to 2 decimal places (~1.1 km coarse grid for privacy); neighborhood selection (Anand Vihar, Rohini, Connaught Place); active municipal policy binding (e.g. GRAP Stage IV emergency measures); local emergency dispatch numbers (`112`). | `packages/contracts/src/profile.ts`, `server/openMeteoClient.ts`, `src/components/WorkspaceToolbar.tsx` | 1. Switch neighborhood in header dropdown to *"Rohini (Industrial/Transport)"*<br>2. Observe immediate update to local PM2.5, official source CPCB/DPCC, and active GRAP policy banner. |
| **"tailored to lifestyle"** | Household profile modeling: dwelling type (`apartment`, `independent_house`, `single_room`, `shared_flat`), size band, window habits, cooking fuel, budget constraints (`free_only`, `low_cost`, `moderate`), renter status, and outdoor work shifts. Pediatric safety: infants < 2 strictly blocked from mask credit. | `packages/contracts/src/profile.ts`, `packages/engines/src/dose_model.ts`, `src/features/household/HouseholdTwin.tsx` | 1. Navigate to `/household`<br>2. Toggle Dwelling Type from "Apartment" to "Single-Room Dwelling"<br>3. Notice real-time counterfactual twin curve recalculation.<br>4. Run `tests/engines.test.ts` (verifies H4 infant mask block). |
| **"clearly explaining the direct impact of their choices"** | 1. **"Why this advice?" panel** on every action: reveals physical mass-balance mechanism, tool call execution IDs, model assumptions, evidence grades, and **computed biggest uncertainty** (e.g. infiltration rate $\lambda$ accounting for 46% of variance).<br>2. **Interactive Counterfactual Slider**: shows quantitative `with` vs `without` PM2.5 dose ($\mu\text{g/day}$), percentage reduction range, and confidence levels. | `src/features/today/ActionCard.tsx`, `src/components/CounterfactualSlider.tsx`, `packages/verifier/src/auditor.ts` | 1. On any action card on `/today`, click *"Why this advice?"*<br>2. Inspect Mechanism, Tool Ref, Assumptions, Evidence Grade, and Computed Biggest Uncertainty.<br>3. Click *"Compare Effect"* to drag the counterfactual slider.<br>4. Run `tests/verifier.test.ts` (verifies V1 numeric provenance). |

---

## 2. Evidence & Honesty Boundary

NIRVAAT adheres to zero invented statistics:
- **Modelled Physics**: Indoor concentrations and inhaled doses are calculated using analytical single-zone mass-balance differential equations ($V \frac{dC}{dt} = P\lambda V C_{out} + S - (\lambda+k+\frac{CADR}{V})VC$), not physical in-home sensors.
- **Single-Zone Boundary**: Assumes a well-mixed uniform air volume; does not model complex inter-room pressure differentials.
- **Pollutant Scope**: Specifically targets submicron particulate matter ($\text{PM}_{2.5}$); does not quantify Ozone ($O_3$), Carbon Monoxide ($CO$), or Nitrogen Oxides ($NO_x$).
- **Medical Disclaimer**: Not a certified medical device; does not diagnose conditions, prescribe pharmaceuticals, or replace clinical care.
- **Audit Verification**: Every number displayed in the UI is audited against an engine tool execution trace before presentation (`V1_NUMERIC_INTEGRITY_MISMATCH`).

---

## 3. End-to-End Offline Demo Path

The entire application runs deterministically **100% offline** without live external internet dependencies:
1. **Mock Telemetry Fallback**: If Open-Meteo or CAMS APIs are unreachable, NIRVAAT automatically falls back to high-resolution Delhi winter-inversion profiles (`packages/engines/src/mockData.ts`).
2. **Deterministic Tier D Planner**: If the Gemini API key is omitted, exhausted, or offline, the server instantly engages the deterministic physics planner (`/api/engines/plan`), generating verified, ranked plans in $<2\text{ms}$.
3. **Automated Offline Test Suite**: `pnpm test` executes all 50 tests completely offline using mocked time and stubbed LLM responses.
