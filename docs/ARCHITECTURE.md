# NIRVAAT Architecture

This document describes the high-level system architecture of NIRVAAT, detailing its neuro-symbolic design, deterministic physics engines, automated safety verifier, and full-stack implementation.

---

## 1. System Overview

NIRVAAT is designed around a **neuro-symbolic boundary**:
- **Symbolic Core**: Physics-grounded mass-balance models, Monte Carlo simulations with Common Random Numbers (CRN), and deterministic verifiers.
- **Neural Layer**: Gemini LLM serving strictly for language synthesis, bilingual parity (`en-IN` / `hi-IN`), conversational formatting, and situational empathy.
- **Strict Verifier Gate**: Every LLM output is audited before leaving the server boundary. If an LLM fabricates a number or violates a clinical safety rule, the output is blocked and replaced with a deterministic fallback plan.

```mermaid
flowchart TD
    subgraph Client["Client (React 19 + Vite)"]
        UI["Accessible Glass UI (WCAG 2.2 AA/AAA)"]
        Router["HTML5 History Router (/today, /forecast, /household, /learn, /audit, /emergency)"]
        State["useNirvaatState Hook"]
        UI --> Router
        Router --> State
    end

    subgraph Security["API Security & Middleware (Express)"]
        Helmet["Helmet CSP & Security Headers"]
        RateLimit["Rate Limiter (Per-IP & Per-Session)"]
        Session["Signed Anonymous Session Cookie (ASVS L1-L2)"]
        ZodGate["Zod Request Validation (.strict())"]
        Helmet --> RateLimit --> Session --> ZodGate
    end

    subgraph Server["Server Orchestration (server.ts)"]
        RedFlagTriage["Multilingual Red-Flag Triage (100% Recall)"]
        EmergencyTriage{"Emergency Symptom?"}
        FallbackEngine["Deterministic Plan Generator (Tier D)"]
        GeminiOrchestrator["Gemini Orchestration (Google Gen AI SDK)"]
        EmergencyResp["Immediate 112/911 Emergency Response (0 LLM Calls)"]
    end

    subgraph Packages["Monorepo Packages"]
        Contracts["@nirvaat/contracts (Zod Schemas & TypeScript Types)"]
        Engines["@nirvaat/engines (Deterministic Mass-Balance & Monte Carlo)"]
        Verifier["@nirvaat/verifier (V1-V8 Auditor & Safety Rules)"]
        Prompts["@nirvaat/prompts (Sanitizer & System Instructions)"]
    end

    subgraph External["External Services & APIs"]
        OpenMeteo["Open-Meteo Air Quality & CAMS Forecast"]
        GeminiAPI["Google Gemini Models"]
    end

    State -- HTTP POST /api/plan --> Helmet
    ZodGate --> RedFlagTriage
    RedFlagTriage --> EmergencyTriage
    EmergencyTriage -- Yes --> EmergencyResp
    EmergencyResp --> State
    EmergencyTriage -- No --> GeminiOrchestrator

    GeminiOrchestrator -- Tool Calls --> Engines
    Engines -- Atmospheric Telemetry --> OpenMeteo
    GeminiOrchestrator -- Prompting --> GeminiAPI
    GeminiAPI -- Draft Plan JSON --> Verifier

    Verifier -- Audit Passed --> State
    Verifier -- Audit Failed / LLM Failure --> FallbackEngine
    FallbackEngine --> State

    Contracts -. Types & Validation .-> Client
    Contracts -. Types & Validation .-> Server
    Contracts -. Types & Validation .-> Engines
    Contracts -. Types & Validation .-> Verifier
```

---

## 2. Package Dependency Architecture

The repository is structured as a pnpm workspace with strict dependency boundaries:

```mermaid
graph TD
    Contracts["@nirvaat/contracts"]
    Engines["@nirvaat/engines"]
    Verifier["@nirvaat/verifier"]
    Prompts["@nirvaat/prompts"]
    Server["server (Express Backend)"]
    Client["src (React 19 Frontend)"]

    Engines --> Contracts
    Verifier --> Contracts
    Prompts --> Contracts
    Server --> Contracts
    Server --> Engines
    Server --> Verifier
    Server --> Prompts
    Client --> Contracts
```

### Package Responsibilities

1. **`@nirvaat/contracts`**:
   - Single source of truth for all data shapes, Zod schemas, and TypeScript interfaces.
   - All server routes and client features derive types via `z.infer<typeof Schema>` (no duplicate interfaces).

2. **`@nirvaat/engines`**:
   - Deterministic single-zone indoor mass-balance physics.
   - Monte Carlo simulation with Common Random Numbers (CRN) using `seedrandom`.
   - Dynamic variance decomposition ensuring $\sum \text{variance\_share} = 100\%$.
   - Inversion timeline calculation and high-performance in-memory cache ($<0.1\text{ms}$ repeated lookups).

3. **`@nirvaat/verifier`**:
   - V1 Numeric Provenance Auditor: Matches all numeric claims in LLM text against engine tool envelopes.
   - V2 Free Option Inclusion: Enforces at least 1 free action per plan for equity.
   - V3 Medication Protection: Rejects medication cessation while permitting inhaled exposure reduction.
   - V4 Infant Mask Prohibition: Prohibits mask recommendations for children under 2 years.
   - V5 Banned Advice Detection: Flags ozonators, ionizers, and burning waste to clean air.
   - V6 Action Rank Order: Confirms descending cost-effectiveness order.
   - V7 Trace Reference Integrity: Verifies all `tool_ref` identifiers.
   - V8 Degradation Tier Alignment: Enforces schema completeness matching telemetry tiers A–D.
   - Multilingual Red-Flag Engine: Evaluates 65+ emergency queries with 100% recall.

4. **`@nirvaat/prompts`**:
   - Prompt injection sanitization: Neutralizes attempts to leak system instructions, override audit passes, or execute arbitrary code.
   - System prompts and structured JSON schema schemas for Gemini LLM calls.

---

## 3. Data Flow & Execution Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor User as Household User
    participant Frontend as React Client
    participant Express as Express Server
    participant Triage as Red-Flag Triage
    participant Engines as Physics Engine
    participant LLM as Google Gemini
    participant Verifier as Safety Verifier

    User->>Frontend: Submit question / profile
    Frontend->>Express: POST /api/plan (signed session cookie)
    Express->>Triage: Check query for acute red-flag symptoms
    alt Acute Respiratory Red-Flag Detected
        Triage-->>Express: Flag matched (e.g. severe breathlessness)
        Express-->>Frontend: HTTP 200 Emergency Mode (Call 112, 0 LLM calls)
    else No Emergency
        Express->>Engines: Execute mass-balance & counterfactuals
        Engines-->>Express: Tool execution traces + numeric envelopes
        Express->>LLM: Generate plan with tool outputs + sanitized user prompt
        LLM-->>Express: Emits Draft JSON Plan
        Express->>Verifier: Audit draft against traces & safety rules
        alt Verifier Passes (100% Valid Numbers & Clinical Rules)
            Verifier-->>Express: Pass
            Express-->>Frontend: HTTP 200 Tailored Plan
        else Verifier Fails (Fabricated Number or Rule Breach)
            Verifier-->>Express: Rejection (V1-V8 breach)
            Express->>Engines: Generate Tier D Deterministic Fallback Plan
            Engines-->>Express: Fallback Plan
            Express-->>Frontend: HTTP 200 Deterministic Plan
        end
    end
    Frontend->>User: Render Accessible Action Cards
```

---

## 4. Frontend Component Architecture

The frontend is modularized into feature boundaries:

- **`src/routes/`**: Route components corresponding to URL views (`TodayRoute`, `ForecastRoute`, `HouseholdRoute`, `LearnRoute`, `AuditRoute`, `EmergencyRoute`).
- **`src/features/today/`**: Core daily decision dashboard (`PlanRenderer`, `ActionCard`, `PlanAuditBadge`, `ChannelPreview`).
- **`src/features/forecast/`**: Inversion timeline chart, exposure ring, and hourly data tables.
- **`src/features/household/`**: Microenvironment twin simulator, dwelling form, and vulnerability selector.
- **`src/features/audit/`**: Session audit history, telemetry tier inspector, and verifier transparency logs.
- **`src/shared/`**: Common state hooks (`useNirvaatState`), error boundaries (`RouteErrorBoundary`), and contracts.
