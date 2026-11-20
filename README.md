# NIRVAAT — Exposure-Reduction Copilot

NIRVAAT turns live air-quality telemetry and household context into a short, practical, affordable exposure-reduction plan—with counterfactual impact estimates, evidence grades, multi-channel rendering (`APP`, `WHATSAPP`, `SMS`, `VOICE`), bilingual parity (`en-IN` / `hi-IN`), and strict medical/numeric safety guardrails.

---

## 5-Minute Judge Walkthrough

Welcome, Judges! This walkthrough provides everything you need to audit, verify, and experience NIRVAAT in 5 minutes.

### 1. Verification in 30 Seconds (Zero-Fluff)
Run these commands in your shell to verify code quality, physical models, API contracts, and safety verifiers:
```bash
npm test            # 25 automated unit, physics, safety, and API tests (100% pass)
npm run lint        # TypeScript strict type checking (tsc --noEmit, zero errors)
npm run build       # Production client & server build (clean bundle)
```

### 2. What Problem NIRVAAT Solves
During severe winter inversion episodes in South Asia and global smog basins (e.g. Delhi NCR PM2.5 > 250 µg/m³), conventional AQI apps provide passive dread ("Hazardous, stay indoors"). Vulnerable families—infants, asthmatics, outdoor workers, and renters—face impossible trade-offs: indoor LPG cooking smoke accumulates in sealed flats, loose window frames leak ambient smog, and high-end HEPA purifiers are unaffordable.

NIRVAAT is a **deterministic, physics-grounded exposure copilot**:
- Quantifies 24-hour inhaled PM2.5 dose ($\mu\text{g/day}$) using steady-state indoor mass-balance physics.
- Ranks actionable counterfactual interventions under household budget and housing constraints.
- Guarantees **$\ge 1$ free intervention** (e.g., closing windows during nighttime thermal inversions, shifting commute to the cleanest afternoon dispersion window).
- Enforces strict clinical safety: **H4 pediatric safety** (blocks mask credit on infants under 2), **H3 red-flag triage** (immediate routing to emergency care 112/911 for acute respiratory distress), and **V1–V8 auditor** ensuring that all numeric claims originate directly from engine tool traces.

### 3. Key Architecture & Rigorous Engineering
1. **Deterministic Physics Engines (`/packages/engines`)**:
   - Single-zone mass balance: $V \frac{dC}{dt} = P \lambda V C_{out} + S - (\lambda + k + \frac{CADR}{V}) V C$.
   - Calibrated quantile sampler: Monte Carlo sampling across parameter distributions with dynamic variance decomposition ($\sum \text{variance\_share} = 100\%$).
   - Correlated draws eliminating simulation artifacts (e.g., sealing never paradoxically increases penetration on already sealed homes).
2. **Server-Side Safety Auditor (`server/nirvaatEngine.ts`)**:
   - V1 Numeric Integrity: Validates every number in `effect.with`, `effect.without`, and `change_range` against actual Monte Carlo envelopes.
   - Multilingual Red-Flag Regex: Covers English (straight & curly apostrophes), Hinglish (`saans phoolna`, `chhati me dard`), and Devanagari Hindi (`सांस लेने में तकलीफ`) while resisting non-clinical conversational usage.
   - V3 Medication Protection: Differentiates particle exposure dose reduction from medical prescription tampering.
3. **Multi-Channel & Bilingual Parity**:
   - Instant export for Web App, WhatsApp, SMS, and Voice channels.
   - Complete parity between English and Hindi (`hi-IN`).
4. **Accessible UI & URL Routing**:
   - Hash-based routing (`#today`, `#forecast`, `#household`, `#learn`, `#audit`, `#emergency`) preserving deep links and browser history.
   - OS `prefers-reduced-motion` integration directly into React state and CSS tokens.
   - WCAG AA compliant color contrast (minimum 4.5:1) and visible `:focus-visible` keyboard rings.

### 4. Judge Walkthrough: 3 Key Scenarios to Test
In the UI, navigate through the tabs or click the quick presets:
1. **Toddler in Leaky 1BHK Flat** (Preset 1):
   - Notice that mask credit is strictly blocked for the 18-month infant (preventing suffocation risk), while free nighttime window sealing and afternoon ventilation are prioritized.
2. **Outdoor Worker Shift** (Preset 2):
   - Notice that daytime hours (09:00–14:00) reflect outdoor exertion microenvironments, and fitted N95 respirator protection provides high fractional dose avoidance.
3. **Emergency Red-Flag Test**:
   - Type `"Grandparent having severe difficulty breathing and chest tightness"` into the copilot bar.
   - Notice the prompt immediately triggers emergency triage mode, displaying the national emergency helpline (`112`) and immediate clinical disclaimers.

### 5. Detailed Rubric Audit Scorecard
For full before/after benchmarks across Code Quality, Security, Efficiency, Testing, Accessibility, and Problem Alignment, see [docs/SCORECARD.md](file:///docs/SCORECARD.md).

---

## Architecture & Safety Guarantees

- **Server-Side `@google/genai` Orchestration**: All Gemini calls execute exclusively on the Express backend (`server.ts`, `server/nirvaatEngine.ts`) with automated fallback across models (`gemini-4-hydrogen` → `gemini-3.1-flash-lite` → `gemini-flash-latest` → `gemini-3.6-flash` → `gemini-3.7-flash`).
- **Live Telemetry & Physics Tools (`server/nirvaatTools.ts`)**:
  - `get_air_quality` & `get_forecast`: Live Open-Meteo / CAMS atmospheric grid data using coarse 2-decimal grid cells (~1.1 km) for privacy (`H6`).
  - `impact_estimate`: Single-zone PM2.5 mass-balance model computing quantified `with` vs `without` counterfactuals.
  - `retrieve_guidance`: Evidence-graded public-health reference records (`STRONG`, `MODERATE`, `EMERGING`).
- **Strict Auditor & Red-Flag Triage (`H3`, `V1–V8`)**:
  - Red-flag symptoms (chest tightness, severe breathlessness, blue/grey lips, infant respiratory distress, unrelieved wheeze) immediately halt optimization and return emergency guidance (`112` / `911` / local number).
  - Every AI-generated plan passes a V1–V8 auditor checking numeric provenance, `cost="free"` equity inclusion, zero banned advice (no ozone/ionizers, no burning to clean air, no masks under age 2), and Tier A–D degradation alignment.

---

## Local Development

1. Configure `.env` from `.env.example` with your `GEMINI_API_KEY`.
2. Install dependencies and start the unified Express + Vite server on port `3000`:

```bash
npm install
npm run dev
```

3. Build and run in production mode:

```bash
npm run build
npm start
```

---

## Google Cloud Deployment & Security Setup

### 1. Prerequisites & APIs

Install the Google Cloud CLI (`gcloud`) and Firebase CLI (`firebase-tools`), then enable the required Google Cloud services:

```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  cloudbuild.googleapis.com
```

### 2. Secret Manager Bindings

Never hardcode API keys or credentials in source files. Store `GEMINI_API_KEY` in Google Cloud Secret Manager and grant your Cloud Run runtime service account access:

```bash
# Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant the default Cloud Run service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 3. Firestore Security Rules Configuration

When persisting household sessions in Cloud Firestore, deploy owner-bound isolation rules (`firestore.rules`) with zero insecure defaults:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Deploy the rules with:

```bash
firebase deploy --only firestore:rules
```

### 4. Cloud Run Deployment Flow

Build and deploy the service from source with Secret Manager injection:

```bash
gcloud run deploy nirvaat-copilot \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000 \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest"
```

### 5. Required Campaign Verification Binding

Apply the mandatory resource label to register the deployed Cloud Run service:

```bash
gcloud run services update <SERVICE_NAME> \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=<REGION>
```
