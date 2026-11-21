# NIRVAAT Architecture & System Blueprint

**Document Version**: 2.0.0  
**Status**: Production Verified  
**Date**: 2026-11-22  

---

## 1. System Context (C4 Level 1)

```mermaid
flowchart TD
  User["At-Risk Citizen / Household Member"]
  subgraph NIRVAAT_System["NIRVAAT Exposure Copilot"]
    System["NIRVAAT Platform<br/>(Single-Zone Mass Balance Physics + Gemini 2.5 + Verifier)"]
  end
  OpenMeteo["Open-Meteo Air Quality API<br/>(CAMS European Ensemble, PM2.5, Coarse Grids)"]
  GeminiAPI["Google Gemini 2.5 Flash<br/>(Structured LLM Framing)"]

  User -->|"Household Profile & Symptoms"| System
  System -->|"Coarse Lat/Lon Query (10km)"| OpenMeteo
  System -->|"Grounded Verification Prompt"| GeminiAPI
  System -->|"Grounded Exposure Harm-Reduction Plan"| User
```

---

## 2. Container Diagram (C4 Level 2)

```mermaid
flowchart TB
  subgraph Client["Web Client (Vite + React 19 + Tailwind CSS)"]
    UI["Single Page App & Bento UI"]
    Router["React Router v7 (Deep Links)"]
    AxeAudit["Client-side A11y & Contrast Layer"]
  end

  subgraph Server["API Server (Express 4 + TypeScript)"]
    SecMiddleware["Security Layer (Helmet CSP, CORS, Rate Limiting, Signed Session)"]
    RouterPlan["API Routes (/plan, /engines/plan, /engines/simulate)"]
    Triage["Safety Gate (detectRedFlagSymptom)"]
    Copilot["Copilot Engine (runNirvaatCopilot)"]
    Verifier["V1–V8 Verifier Pipeline (auditDraftPlan)"]
  end

  subgraph Packages["Decoupled Domain Packages"]
    Contracts["@nirvaat/contracts<br/>Zod Schemas & Single Source of Truth"]
    Engines["@nirvaat/engines<br/>Single-Zone ODE, Monte Carlo CRN, Dose Model"]
    Prompts["@nirvaat/prompts<br/>Strict Prompts & Query Sanitizer"]
    VerifierPkg["@nirvaat/verifier<br/>Numeric Verifier & Banned Advice Regexes"]
  end

  UI --> Router
  Router -->|"HTTP / REST"| SecMiddleware
  SecMiddleware --> RouterPlan
  RouterPlan --> Triage
  Triage -->|"Normal Route"| Copilot
  Triage -->|"Emergency Detected"| RouterPlan
  Copilot --> Engines
  Copilot --> VerifierPkg
  Copilot --> Prompts
  RouterPlan --> Contracts
```

---

## 3. Plan Generation Sequence Diagram (C4 Level 3)

```mermaid
sequenceDiagram
  autonumber
  actor User as User / Client
  participant Server as Express Server (/api/plan)
  participant Triage as Red-Flag Triage
  participant AQ as Open-Meteo Cache / Client
  participant Physics as Monte Carlo CRN Engine
  participant LLM as Gemini 2.5 Flash
  participant Verifier as V1–V8 Truth Verifier

  User->>Server: POST /api/plan { query, profile, locale }
  Server->>Triage: checkRedFlags(query)
  alt Red Flag Symptom Detected (e.g. stridor, cyanosis)
    Triage-->>Server: isRedFlag = true
    Server-->>User: HTTP 200 Emergency Plan (0 LLM Calls, Local SOS Number)
  else Normal Advisory Request
    Server->>AQ: fetchLiveAirQualitySummary(coarseLat, coarseLon)
    AQ-->>Server: Hourly PM2.5 Forecast Array (24h)
    Server->>Physics: batchEvaluateActionsCRN(profile, forecast)
    Physics-->>Server: Deterministic Tool Envelopes (with/without delta, avoided dose µg)
    Server->>LLM: generateContent(SystemPrompt + Tool Envelopes)
    LLM-->>Server: Draft JSON Plan
    Server->>Verifier: auditDraftPlan(draft, toolTraces, query, runtime)
    alt Verification Fails (V1 numeric hallucination or V3 banned advice)
      Verifier-->>Server: pass = false (violations logged)
      Server->>Server: Fallback to Safe Deterministic Plan Template
    else Verification Passes
      Verifier-->>Server: pass = true
    end
    Server-->>User: HTTP 200 Verified Plan (Honest Tier A/B/C)
  end
```

---

## 4. Architectural Invariants & Bounds

1. **Deterministic Physics First**: All quantitative metrics ($\mu\text{g/day}$, $\%$ reduction, time ranges) originate strictly from differential mass balance equations and Common Random Numbers.
2. **Zero-Trust AI Guardrails**: Gemini outputs cannot reach the user without passing the V1–V8 verification engine. Any numerical hallucination or banned advice triggers fallback to the deterministic template.
3. **Emergency Zero-Latency Circuit Breaker**: Severe medical distress symptoms immediately short-circuit to emergency guidance with zero LLM API dependency.
