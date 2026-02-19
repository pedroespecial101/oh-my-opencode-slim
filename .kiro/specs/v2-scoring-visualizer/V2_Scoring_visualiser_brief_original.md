<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# OK, that is a lot of hard coded logic to delight and confuse! It occurs to me though that our end goal is to create a UI where the USER makes and informed choice and assigns models and stacks backups. We can leave it up to the user as to whether they want to stuff one provider or not use a supposendly non-optimal mopdel regardless of a good score.

It seems the V2 logic is mostly concerned with 'actual' scores whereas the post-procesing install script is somewhat more opinionated. Would you agree? If so, I suggest, for our purposes, we ignore all of the post-processing that comes after the v2 scoring. We still take notice of the hard coded elements in v2 and bring those to the users' attention for what we're really trying to do, which is assess the scoring system. Once I understand this, then we'll be able to bring some of that scoring into the UI, which enables the user to make an informed choice based on the scoring system as it sits at the moment. What do you think?

If you agree, please make a complete brief at that high level from our AI agent to start work on this stage of producing the tabbed system to surface and visualise the work that is going on in the v2 scoring system.

Yes, completely agree — that's a clean and correct distinction:

- **V2 = scoring model** — "how good is this model for this role, objectively?"
- **`buildDynamicModelPlan` = policy engine** — "given business constraints (subscriptions, provider diversity, user preferences), which model do we actually pick?"

The policy engine is useful for automation but it's actively the *wrong* thing to expose in a tool whose purpose is helping a human make an informed choice. You want the scores uncontaminated by opinions about subscription balancing. Perfect call.

Here's the complete agent brief:

***

## Agent Brief: V2 Scoring System Visualiser — Phase 1

### Context

This is the `pedroespecial101/oh-my-opencode-slim` fork of `alvinunreal/oh-my-opencode-slim`. The codebase has a V2 model scoring system in `src/cli/scoring-v2/` that evaluates AI models for six agent roles (orchestrator, oracle, designer, explorer, librarian, fixer). The goal of this phase is to produce a self-contained HTML visualiser that surfaces how that scoring system works, from raw model data through to final V2 scores. This is an educational/diagnostic tool to help the developer understand and audit the scoring system before building a user-facing model assignment UI on top of it.

**Do not reference or import from `src/cli/score-models.ts` (old work, contains bugs). Do not use `buildDynamicModelPlan()` or anything from `src/cli/dynamic-model-selection.ts`. Work only with the V2 scoring system.**

***

### Deliverable 1 — `src/cli/scoring-v2/dump-v2-scores.ts`

A standalone CLI script. Run with `bun run src/cli/scoring-v2/dump-v2-scores.ts` and it writes `scoring-v2-dump.json` to the project root.

**What it must do:**

1. Call `discoverModelCatalog()` from `../opencode-models`. Filter to models where `status !== 'deprecated'` and `status !== 'inactive'`. Do **not** hardcode any provider lists.
2. Call `fetchExternalModelSignals()` from `../external-rankings`, passing `ARTIFICIAL_ANALYSIS_API_KEY` and `OPENROUTER_API_KEY` from `process.env` if present. If keys are absent, pass `undefined` — do not error. Record which models have signal data and which don't.
3. For each agent type, call `getFeatureWeights(agent)` from `./weights` to capture resolved weights.
4. For each model × each agent, call `scoreCandidateV2(model, agent, externalSignals)` from `./engine`. Capture the full returned object including `features`, `weighted`, and `totalScore`.
5. Write `scoring-v2-dump.json` with this exact top-level structure:
```json
{
  "generatedAt": "<ISO timestamp>",
  "agentTypes": ["orchestrator", "oracle", "designer", "explorer", "librarian", "fixer"],
  "hasExternalSignals": {
    "artificialAnalysis": true,
    "openRouter": false
  },
  "weights": {
    "orchestrator": { "status": 22, "reasoning": 22, ... },
    "oracle": { ... },
    ...
  },
  "models": [
    {
      "id": "anthropic/claude-opus-4",
      "name": "Claude Opus 4",
      "providerID": "anthropic",
      "status": "active",
      "rawData": {
        "contextLimit": 200000,
        "outputLimit": 32000,
        "reasoning": true,
        "toolcall": true,
        "attachment": true
      },
      "externalSignals": {
        "present": true,
        "latencySeconds": 2.1,
        "qualityScore": 87,
        "codingScore": 91,
        "inputPricePer1M": 15,
        "outputPricePer1M": 75
      },
      "byAgent": {
        "orchestrator": {
          "features": { "status": 1, "context": 1.8, "reasoning": 1, ... },
          "weighted": { "status": 22, "context": 14.4, "reasoning": 22, ... },
          "totalScore": 134.5
        },
        ...
      }
    }
  ]
}
```

If `externalSignals` are absent for a model, set `"present": false` and all signal fields to `null`.

***

### Deliverable 2 — `scoring-visualiser.html`

A single self-contained HTML file in the project root. No build step. No external dependencies (no CDN calls). All CSS and JS inline. Loads `scoring-v2-dump.json` via `fetch('./scoring-v2-dump.json')` on page load.

#### Global Header (sticky)

- Page title: "V2 Scoring Visualiser"
- "Generated: `<timestamp from JSON>`" in small text
- **Agent Type filter** — button group: `All | Orchestrator | Oracle | Designer | Explorer | Librarian | Fixer`
- **Signal filter toggle** — checkbox: "Hide models with missing external signals"
- These filters affect all tabs simultaneously


#### Tab 1 — Weights

A matrix table with **features as rows, agent types as columns**. Include a BASE column showing the base weight and highlight cells where an agent's weight **differs** from base. Apply a heat-map background — higher absolute weight = darker colour, use a different hue for any negative weights. When an agent filter is active, bold that column. Add a plain-English description column on the left explaining what each feature measures.

#### Tab 2 — Raw Data

One row per model. Columns: Model ID | Provider | Status | Context (K tokens) | Output (K tokens) | Reasoning | Toolcall | Attachment | Latency (s) | Quality Score | Coding Score | Input \$/1M | Output \$/1M. Booleans shown as ✓/✗. Missing external signal cells shown as `—` with an amber background. When an agent filter is active, highlight the columns most relevant to that agent (based on the highest-weight features for that agent in Tab 1).

#### Tab 3 — Normalised Features

Same rows as Tab 2. Columns are the `features` values from `byAgent[selectedAgent]` — the output of `extractFeatureVector()`. When "All" is selected for agent filter, default to Orchestrator. Per-column heat-map scaling (each column independently normalised 0→max within that column). Tooltip on each column header explaining the normalisation formula used.

#### Tab 4 — V2 Scores \& Rankings

One row per model. Columns: Rank | Model | Provider | one column per weighted feature | **Total Score**. Sorted by `totalScore` descending for the active agent. Mini horizontal bar chart in the Total Score cell (inline SVG, proportional to max score in view). Clicking a row expands it to show a per-feature bar chart comparing that model's weighted contributions vs the \#1 ranked model for that agent. Tab 4 requires an agent to be selected — if "All" is active, prompt the user to select one.

#### Tab 5 — Hardcodes \& Gotchas

Static reference panel — no data binding needed. Three sections:

**Section A: V2 Feature Hardcodes** — table listing every hardcoded adjustment inside `features.ts`: the regex pattern used, which provider it targets (if any), which agent types are affected, the numeric effect, and a plain-English description of the risk (e.g. "model ID format change silently breaks this match").

**Section B: Known Pattern-Match Risks** — list of model naming gotchas: variations that would cause a model to miss a bonus/penalty (e.g. `kimi-k2.5` vs `kimi_k2_5`, `qwen3` vs `qwen-3`).

**Section C: V2 Scoring Scope Notes** — brief plain-English note explaining that this visualiser shows only V2 scoring output. The install pipeline applies additional post-scoring policy logic (provider diversity, subscription balancing, manual user pins) that can override these scores. That logic is intentionally excluded here because this tool's purpose is evaluating model quality, not installation policy.

***

### Implementation Notes

- Start with Deliverable 1. Verify `scoring-v2-dump.json` is valid and populated before touching the HTML.
- Validate that `features` and `weighted` keys in the JSON match the actual fields returned by `scoreCandidateV2()` — do not assume field names, read `src/cli/scoring-v2/types.ts` first.
- The HTML file must work when opened directly via `open scoring-visualiser.html` after running a local server (`python3 -m http.server` or equivalent) in the project root — `fetch()` requires a server context.
- No TypeScript in the HTML — pure vanilla JS only.
- Prefer a clean, readable layout. This is a developer diagnostic tool, not a product UI — clarity over aesthetics.

