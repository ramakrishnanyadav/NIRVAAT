# ADR 0002: Tool-Only Numeric Provenance and V1 Verification

## Status
Accepted

## Context
In conversational AI interfaces, users place high trust in specific numeric statistics (e.g. "Reduces your exposure by 34%"). If an LLM fabricates these numbers, users may take ineffective actions or assume false security in dangerous smog conditions.

Previous revisions relied on checking whether a `tool_ref` string existed in the JSON response, without validating whether the numbers inside `effect.with`, `effect.without`, or `change_range` matched the actual output of the tool. An LLM could cite `tool_ref: "impact_estimate_1"` while inventing arbitrary reduction percentages.

## Decision
We enforce a strict **V1 Numeric Provenance Auditor** inside `@nirvaat/verifier`:
1. **Trace Registry**: When the engine runs Monte Carlo mass-balance tools, every executed tool records its exact numeric distribution (p10, p50, p90, bounds) into a signed `trace` collection.
2. **Numeric Extraction & Boundary Audit**: The verifier parses all numeric quantities (integers, floats, percentage ranges, and negative reductions) from the draft plan's `effect` objects and narrative text.
3. **Envelope Check**: Every extracted number must fall within the mathematical envelope of the corresponding tool trace (allowing a narrow margin for rounding, e.g., ±25% for rounded percentage approximations and Devanagari numerals).
4. **Immediate Rejection of Hallucinations**: If the model cites a number that cannot be traced to an engine envelope, the plan fails verification with code `V1_NUMERIC_INTEGRITY_MISMATCH` and is replaced with a deterministic fallback plan.

## Consequences
### Positive
- **100% Elimination of Hallucinated Percentages**: Verified in the evaluation suite (`tests/evals.test.ts`), blocking fabricated numbers 100% of the time while passing valid roundings and Devanagari numerals.
- **Explainability**: Regulators and health professionals can independently verify how each number was calculated.

### Negative
- **Regex & Parser Complexity**: The parser must reliably handle varied formatting: signed numbers (`-35%`), ranges (`28% to 42%`), Hindi/Devanagari digits (`२८%`), and unit annotations (`µg/m³`).
