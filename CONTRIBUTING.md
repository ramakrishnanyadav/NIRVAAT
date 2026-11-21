# Contributing to NIRVAAT

Thank you for contributing to NIRVAAT! This repository is engineered as a safety-critical, neuro-symbolic exposure copilot. All contributions must adhere to our strict architectural principles, automated tests, and safety verifiers.

---

## 1. Monorepo Organization

NIRVAAT is managed as a `pnpm` workspace:

- **`packages/contracts/`**: Zod schemas and TypeScript types. This is the **single source of truth** for all API payloads, profile models, and telemetry contracts. Do not duplicate interfaces elsewhere.
- **`packages/engines/`**: Deterministic physical simulation engines (single-zone indoor mass balance, Monte Carlo quantile sampler with Common Random Numbers, inversion timeline calculators).
- **`packages/verifier/`**: Deterministic safety auditor (V1 numeric provenance, V2 free option inclusion, V3 medication protection, V4 infant mask safety, V5 banned advice detection, multilingual red-flag triage).
- **`packages/prompts/`**: Prompt templates, prompt injection sanitizers, and system instructions.
- **`server/`**: Express 4 API server with OWASP ASVS L1–L2 session isolation, sliding-window rate limiters, Helmet CSP, and Gemini orchestration.
- **`src/`**: React 19 frontend structured into feature modules (`routes/`, `features/today/`, `features/forecast/`, `features/household/`, `features/audit/`, `shared/`).
- **`evals/`**: Evaluation datasets, including `redflags.json` (65+ multilingual test cases).
- **`docs/`**: Architecture diagrams, ADRs, accessibility audits, performance benchmarks, and threat models.

---

## 2. Prerequisites & Setup

- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **Package Manager**: `pnpm` (`v9.x` or `v10.x`)

```bash
# Clone the repository
git clone https://github.com/nirvaat/nirvaat.git
cd nirvaat

# Install workspace dependencies
pnpm install

# Setup environment variables
cp .env.example .env
# Edit .env and supply your GEMINI_API_KEY
```

---

## 3. Development Workflow

Start the unified full-stack development server (Express API on port `3000` + Vite HMR):

```bash
pnpm dev
```

The application will be accessible at `http://localhost:3000`.

---

## 4. Verification & Testing

Every pull request must pass the automated test suites, type checking, and accessibility audits:

```bash
# 1. Run all unit, integration, physics, and safety tests (50 tests)
pnpm test

# 2. Run TypeScript strict type-checking
pnpm run lint

# 3. Run automated WCAG AA/AAA glass surface contrast audit
pnpm run test:contrast

# 4. Verify production client and server builds
pnpm run build

# 5. Run latency and throughput benchmarks
pnpm run benchmark
```

---

## 5. Architectural & Coding Guidelines

1. **File Size Limits**:
   - **No file may exceed 400 lines**.
   - **No React component may exceed ~250 lines**. Split subcomponents or helpers into feature folders.
2. **Type Safety & Zero `any`**:
   - Derive all types from `@nirvaat/contracts` using `z.infer<typeof Schema>`.
   - Explicit types are required for function arguments and return types. No `any` is permitted in contracts, verifiers, or engines.
3. **Deterministic Physics & Common Random Numbers**:
   - Never use non-deterministic `Math.random()` in physical impact evaluations. Use `seedrandom` with correlated seeds across paired baseline and counterfactual draws.
4. **Tool-Only Numeric Integrity**:
   - The LLM must never perform direct mental arithmetic. All numbers displayed in action effects must be backed by a deterministic tool trace envelope (`V1_NUMERIC_INTEGRITY_MISMATCH`).
5. **Accessibility (WCAG 2.2 AA / AAA)**:
   - Every control must be keyboard operable with visible focus rings ($\ge 3:1$ contrast on glass).
   - Never convey state with color alone; pair colors with text labels, patterns, or tactile indicators.
   - Respect user motion preferences via the in-app "Reduce motion" toggle and `MotionConfig`.
6. **No PII in Telemetry or Logs**:
   - Structured logs must never output user IP addresses, precise coordinates, or raw queries. Coordinates must be rounded to coarse 2-decimal grid cells (~1.1 km).
