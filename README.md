# NIRVAAT — Exposure-Reduction Copilot

NIRVAAT turns live air-quality telemetry and household context into a short, practical, affordable exposure-reduction plan—with counterfactual impact estimates, evidence grades, multi-channel rendering (`APP`, `WHATSAPP`, `SMS`, `VOICE`), bilingual parity (`en-IN` / `hi-IN`), and strict medical/numeric safety guardrails.

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
