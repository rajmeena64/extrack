---
name: ponytail
description: Enforces lean, unbloated, zero-assumption, high-efficiency development. Prevents over-engineering, unnecessary dependencies, speculative fallback permutations, hardcoded magic numbers, and unverified assumptions. Requires the agent to climb the decision ladder (native platform > standard library > existing codebase > minimal code) and prove every claim with end-to-end caller verification.
---

# Ponytail Skill: The Lazy Senior Developer Philosophy

"The best code is the code you never wrote. The best claim is the one backed by empirical proof."

## Core Principles

### 1. The Decision Ladder (Climb Before Writing Code)
Before introducing any new logic, helper, library, or abstraction, always climb this ladder in order:
1. **Does this need to exist at all?** (YAGNI - You Ain't Gonna Need It). Eliminate unnecessary steps.
2. **Does the native platform / standard library provide it?** Use native JS, Web APIs, ClickHouse SQL, PostgreSQL primitives instead of third-party baggage or custom convoluted loops.
3. **Does the existing codebase already have a canonical helper/component?** Reuse canonical helpers (e.g. `dropdown.tsx`, `instrumentRepository.js`, `chartHelpers.js`). Never duplicate logic.
4. **Is it the single, canonical authoritative path?** Never build ad-hoc side doors, secondary fallback pipelines, or speculative alternatives.

---

### 2. Zero Unverified Claims & Proof Before Speech
- **Strictly Prohibited:** Stating that a feature is "dynamic", "auto-calculating", "standard", or "working" based on theory, assumptions, or half-checked code.
- **Mandatory Caller Inspection:** You MUST trace the full call chain:
  `UI Component -> Hook/Engine -> Datafeed/Service -> Controller/Route -> Database/Provider`
- **Fact-Based Communication:** State only the exact file paths, line numbers, and verified runtime values. If a variable is static in code, acknowledge it as static; never claim it is dynamic without seeing the dynamic calculation in place.

---

### 3. Anti-Patterns (Strictly Forbidden)

1. **No Speculative Property Permutations / Guesswork Fallbacks:**
   - ❌ FORBIDDEN: `trade.trade_id || trade.tradeId || trade.id || trade['Trade Id']`
   - ✅ REQUIRED: Inspect the authoritative schema / provider response and use the single canonical key.

2. **No Magic Hardcoded Constants in Dynamic Paths:**
   - ❌ FORBIDDEN: Hardcoding `countBack = 600`, `limit = 250`, or fixed delays/timeouts where dynamic parameters are expected.
   - ✅ REQUIRED: Dynamically calculate from runtime state (e.g. `visibleLogicalRange`, viewport dimensions, payload parameters).

3. **No Guesswork Day/Session Heuristics:**
   - ❌ FORBIDDEN: Writing `if (day === 'Friday')` or `if (isWeekend)` when database range math (`timestamp < endSec ORDER BY timestamp DESC LIMIT limit`) solves the problem universally for all calendar scenarios.
   - ✅ REQUIRED: Use pure, universal timestamp and range algebra.

4. **No Premature Success Declarations:**
   - ❌ FORBIDDEN: Declaring a task done immediately after modifying a file.
   - ✅ REQUIRED: Run builds, linters, tests, and verify runtime logs empirically.

---

## Verification Workflow for Every Change

1. **Identify Single Canonical Authority:** Check DB schema / Catalog / Instrument Repository.
2. **Trace Caller Chain:** Verify all calling files and consuming components.
3. **Apply Minimal Clean Patch:** Write the absolute smallest, most robust change without bloated wrappers.
4. **Run Compliance Checks:**
   - `npm run check:disclosure`
   - `npm run check:fallbacks`
   - Run syntax and unit verification.
5. **Report Hard Facts:** Present the verified results, logs, and consequences with zero exaggeration.
