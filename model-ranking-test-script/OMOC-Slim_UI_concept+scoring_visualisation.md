<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# I have decided to use the V2 scoring system for my initial tests now.

I am going to start a new conversation.
Pls summerise this convo including:

- Orioginal idea: create UI for matching Models >> agents and graphically stacking fallbacks
- Initial reserach: look at model scoring system. Looked at V1  and found V2 to be better strucutured. Will start over with creating model ranking tables visually using V2 logic
- anything else important to note

Here's a clean handoff summary you can paste at the start of your new conversation:

***

## Project Handoff: oh-my-opencode-slim Model Scoring

### Repo

**Fork:** `github.com/pedroespecial101/oh-my-opencode-slim`
**Upstream:** `github.com/alvinunreal/oh-my-opencode-slim`

***

### Original Goal

Build a UI for **visually matching models to agents** and **graphically stacking fallback chains** — a drag-and-drop style interface showing which model sits in which agent role (orchestrator, oracle, designer, explorer, librarian, fixer) and how the fallback cascade is ordered.

***

### Research Phase

To feed that UI with real data, we first needed to understand how the codebase scores and selects models.

**Key files investigated:**

- `src/cli/install.ts` — the installer entry point
- `src/cli/dynamic-model-selection.ts` — the V1 scorer (`rankModelsV1WithBreakdown`)
- `src/cli/opencode-models.ts` — `discoverModelCatalog()` which calls `opencode models --refresh --verbose`
- `src/cli/external-rankings.ts` — `fetchExternalModelSignals()` for AA + OpenRouter data
- `src/cli/scoring-v2/` — the V2 scorer (exists but unused by the installer)

**Findings:**

- The installer uses **V1 scoring** (`rankModelsV1WithBreakdown`) — a hand-tuned 0–200 scale with tier bonuses, recency, context/output bumps
- **V2 scorer exists** in `src/cli/scoring-v2/` and is better structured (cleaner separation of concerns, more explicit breakdown), but is not yet wired into the installer
- External signals (Artificial Analysis + OpenRouter) feed into the scorer but require API keys via `ARTIFICIAL_ANALYSIS_API_KEY` and `OPENROUTER_API_KEY` env vars

***

### `score-models.ts` — Script Created + Problems Found

An AI coder created `src/cli/score-models.ts` to expose the scoring logic as a standalone CLI tool. Two bugs were identified:

1. **Hardcoded provider list** — instead of filtering by `status === 'active'` from the live catalog, the AI invented a static whitelist `['opencode', 'github-copilot', 'kiro', 'perplexity']`. This causes irrelevant models (e.g. `openrouter/*`) to appear or disappear unexpectedly.
2. **`externalSignalBoost` always 0** — the field name was likely invented and doesn't exist on `V1RankedScore`. The actual breakdown has separate fields (e.g. `aaRankBonus`, `orPriceBonus`). Additionally, no AA/OR API keys were present during test runs, so signals were empty anyway.

These bugs were diagnosed but **not yet fixed** before this conversation ended.

***

### Decision Going Forward

**Switch to V2 scoring** for all new work. V1 is what the installer currently uses, but V2 is better structured for building a UI on top of — cleaner breakdown fields, more explicit scoring components, easier to display per-dimension scores visually.

**Next steps:**

- Understand the full V2 scorer API (`src/cli/scoring-v2/`)
- Rewrite `score-models.ts` to use V2 instead of V1
- Verify the breakdown fields are real (not invented) before building the UI on top of them
- Filter catalog to `status === 'active'` only — no hardcoded provider lists
- Build the visual model→agent assignment UI using V2 scores as the data source

***

### Important Context Notes

- `discoverModelCatalog()` returns **everything OpenCode knows about**, not just authenticated/active providers — always filter by `status`
- The installer's concept of "active provider" is based on user config toggles (hasOpenAI, hasAnthropic, etc.), not live auth state
- Tmux integration exists in the config but is currently **disabled** due to a known bug
- `opencode/big-pickle` is the hardcoded zen fallback model used when nothing else is available

