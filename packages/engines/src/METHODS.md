# NIRVAAT Deterministic Exposure Engines — Methods & Limitations Note

**Scope**: Pure deterministic PM2.5 indoor-outdoor mass balance and inhaled dose counterfactuals for winter smog exposure planning (`priors_version: 1.0.0`).

## 1. Indoor Concentration Model (`indoor_model`)
Hourly indoor PM2.5 concentration is solved using an analytical single-zone mass balance over 1-hour steps:

$$\frac{dC_{\text{in}}}{dt} = P \cdot \lambda \cdot C_{\text{out}} + \frac{S}{V} - \left(\lambda + k + \frac{\text{CADR}_{\text{eff}}}{V}\right) C_{\text{in}}$$

- **$P$**: Fine-particle penetration factor through building cracks (Stephens & Siegel 2012).
- **$\lambda$**: Air-exchange rate (1/h), shifted by window state and gap sealing (Riley et al. 2002; ASHRAE Ch. 16).
- **$k$**: Indoor PM2.5 surface deposition loss rate (0.22–0.60 /h).
- **$S$**: Indoor combustion emissions (LPG cooking plumes, incense/coils).
- **$\text{CADR}_{\text{eff}}$**: Rated clean air delivery rate multiplied by placement/sleep-speed derating (`0.65` conservative median for DIY Corsi-Rosenthal box fans).

## 2. Inhaled Dose Model (`dose_model`)
Daily and overnight inhaled PM2.5 dose ($\mu\text{g}$) sums across micro-environments (`home`, `commute`, `school`, `outdoors`):

$$\text{Dose} = \sum_{t} C_{\text{micro}}(t) \cdot \left(1 - \eta_{\text{mask}}\right) \cdot V_E(\text{age\_band}, \text{activity}) \cdot \Delta t$$

Inhalation rates $V_E$ follow population-average reference bands from the US EPA Exposure Factors Handbook (2011). Masks are strictly disabled ($\eta_{\text{mask}} = 0$) for `infant_under_2`.

## 3. Monte Carlo Counterfactuals & Sensitivity (`impact_estimate`)
Each candidate action runs 120 seeded draws across the versioned prior intervals ($q_{10}, q_{50}, q_{90}$), reporting median and 10–90% exposure intervals alongside dominant uncertainty drivers (e.g., frame leakiness $\lambda$ or mask seal fit).

## 4. Explicit Limitations (Honesty Boundary)
1. **Single-zone simplification**: Assumes well-mixed room air unless two-zone exchange is enabled; local plumes near stoves can briefly exceed room averages.
2. **PM2.5 only**: Does not model gaseous co-pollutants ($\text{NO}_2$, CO, VOCs) or acute allergen triggers.
3. **Population-average breathing rates**: Individual metabolic or respiratory conditions vary.
4. **Not a medical risk prediction**: Outputs estimate relative particle dose reduction only and never replace clinical evaluation.
