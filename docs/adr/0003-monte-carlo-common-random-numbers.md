# ADR 0003: Monte Carlo Simulation with Common Random Numbers (CRN)

## Status
Accepted

## Context
Estimating counterfactual exposure reduction requires comparing an individual's 24-hour PM2.5 dose under baseline conditions against their dose under a proposed intervention (e.g. sealing window gaps, using a DIY box filter, or shifting commute hours).

When running independent Monte Carlo draws for baseline and counterfactual scenarios, stochastic simulation variance introduces non-physical artifacts:
1. **Simulation Noise Inversions**: An intervention that improves dwelling tightness could randomly draw higher outdoor penetration factors in the counterfactual than in the baseline, resulting in a paradoxical negative dose reduction (`dose_avoided < 0`) on an already tight dwelling.
2. **Reproducibility Issues**: Successive calls with identical household parameters yielded slightly different rankings, undermining user confidence.

## Decision
We adopt **Common Random Numbers (CRN)** for all Monte Carlo evaluations within `@nirvaat/engines`:
1. **Coupled Baseline and Counterfactual Draws**: Both the baseline simulation and the counterfactual action simulation are driven by the exact same pseudo-random sequence, seeded using `seedrandom(hash(profile, date))`.
2. **Correlated Stochastic Draws**: The parameter draw for room volume, infiltration rate, and breathing rate is held identical between paired draws $(i_{\text{baseline}}, i_{\text{counterfactual}})$, isolating only the causal physical delta of the intervention.
3. **Variance Share Normalization**: The Monte Carlo engine dynamically computes variance attribution across parameter distributions, guaranteeing that $\sum \text{variance\_share} = 100\%$.
4. **Deterministic In-Memory Caching**: Results are memoized by a cryptographic hash of `(profile_features, action, forecast_version, priors_version)`, yielding $<0.1\text{ms}$ retrieval for identical query states.

## Consequences
### Positive
- **Guaranteed Physical Monotonicity**: An effective intervention never produces negative dose avoidance due to stochastic sampling error.
- **Strict Reproducibility**: Identical seeds guarantee identical outputs, enabling deterministic regression testing in CI (`tests/engines.test.ts`).
- **Reduced Sampling Size**: By eliminating cross-run simulation variance, convergence to accurate median and 90% confidence bounds requires fewer draws ($N = 120$ to $300$).

### Negative
- **Seeding Coordination**: Seeds must be deterministically generated and passed consistently across parallel microenvironment steps.
