<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# OK, so can you give me a prompt for an AI coder which is currently looking at the code base and its current project for Oh My OpenCode? Tell it exactly the script that it needs to create, which mirrors the process of the installer.

```markdown
# Task: Create Standalone Model Scoring Script

## Context
You're working in the `oh-my-opencode-slim` repository. Your task is to create a standalone TypeScript script that mirrors the **exact scoring logic** the installer uses to rank and select models for each agent role.

## Objective
Create `src/cli/score-models.ts` that:
1. Reads the model catalog (same way the installer does)
2. Fetches external signals (Artificial Analysis + OpenRouter)
3. Runs the **V1 scoring engine** (`rankModelsV1WithBreakdown`)
4. Outputs a detailed table with full score breakdowns for all models

## Requirements

### 1. Model Catalog Input
Use the existing `discoverModelCatalog()` function from `src/cli/opencode-models.ts` to fetch the full model list:

```typescript
import { discoverModelCatalog } from './opencode-models';

const { models, error } = await discoverModelCatalog();
```

This returns `DiscoveredModel[]` with all the metadata the scoring functions expect.

### 2. External Signals

Use the existing `fetchExternalModelSignals()` function from `src/cli/external-rankings.ts`:

```typescript
import { fetchExternalModelSignals } from './external-rankings';

const { signals, warnings } = await fetchExternalModelSignals({
  artificialAnalysisApiKey: process.env.ARTIFICIAL_ANALYSIS_API_KEY,
  openRouterApiKey: process.env.OPENROUTER_API_KEY,
});
```


### 3. Scoring Engine

Use the **V1 scorer** from `src/cli/dynamic-model-selection.ts`:

```typescript
import { rankModelsV1WithBreakdown } from './dynamic-model-selection';

// Score for each agent role
const roles = ['oracle', 'orchestrator', 'designer', 'explorer', 'librarian', 'fixer'];

for (const role of roles) {
  const ranked = rankModelsV1WithBreakdown(models, role, signals);
  // ranked contains: { model: string, score: number, breakdown: {...} }[]
}
```


### 4. Output Format

Generate a **markdown table** (or CSV) with these columns:

```
| Model | Role | Total Score | Base | Tier Bonus | Recency | Context | Output | AA Rank | OR Rank | Reasoning | Tools | Attachments |
```

Include:

- **All models** from the catalog (not just top picks)
- **All agent roles** (oracle, orchestrator, designer, explorer, librarian, fixer)
- **Full breakdown** from the `breakdown` object returned by `rankModelsV1WithBreakdown`
- Sort by score (descending) within each role


### 5. CLI Interface

Make it runnable as:

```bash
bun run src/cli/score-models.ts [--role=oracle] [--output=scores.csv]
```

Options:

- `--role=<role>` — Score for specific role only (default: all roles)
- `--output=<file>` — Write to file (default: stdout)
- `--format=<csv|md>` — Output format (default: markdown table)


## Key Implementation Details

### Score Breakdown Structure

The V1 scorer returns breakdowns like:

```typescript
{
  base: number,           // Base score from model name heuristics
  tierBonus: number,      // +30/+20/+10 for tier 1/2/3 models
  recencyBonus: number,   // +0 to +10 based on release date
  contextBonus: number,   // +5 if context > 200k
  outputBonus: number,    // +5 if output > 32k
  aaRankBonus: number,    // Bonus from Artificial Analysis ranking
  orPriceBonus: number,   // Bonus from OpenRouter cost signals
  reasoning: boolean,     // Has reasoning capability
  toolcall: boolean,      // Has tool calling
  attachment: boolean,    // Has attachment support
}
```


### Role-Specific Scoring

The scorer adjusts weights based on role:

- **oracle/orchestrator** — Heavy reasoning, high context, premium models preferred
- **designer** — Balance of reasoning and speed
- **explorer/librarian/fixer** — Speed over intelligence, lower-tier models acceptable


### Free Model Handling

The V1 scorer **excludes free models** when paid alternatives exist. If you want to include them, you'll need to handle the filtering logic separately.

## Files to Reference

1. **`src/cli/dynamic-model-selection.ts`** — Contains `rankModelsV1WithBreakdown()` (the V1 scorer)
2. **`src/cli/external-rankings.ts`** — Contains `fetchExternalModelSignals()`
3. **`src/cli/opencode-models.ts`** — Contains `discoverModelCatalog()`
4. **`src/cli/types.ts`** — Type definitions for `DiscoveredModel`, `ExternalModelSignals`, etc.
5. **`src/cli/install.ts`** — Shows how the installer calls these functions (lines 520-540)

## Verification

After creating the script, verify it produces scores that match what the installer would use:

1. Run: `bun run src/cli/score-models.ts --role=oracle`
2. Compare top 3 results to what `buildDynamicModelPlan()` would select
3. Check that score breakdowns add up: `total = base + tierBonus + recencyBonus + contextBonus + outputBonus + aaRankBonus + orPriceBonus`

## Success Criteria

✅ Script imports and calls existing scoring functions (no reimplementation)
✅ Outputs full catalog with scores for all roles
✅ Breakdown columns show how each score component was calculated
✅ Top-ranked models match what the installer would select
✅ Can export to both markdown and CSV formats
✅ Handles missing external signals gracefully (empty API keys)

## Expected Output Sample

```markdown
## Oracle Agent Rankings

| Rank | Model | Score | Base | Tier | Recency | Context | Output | AA | OR | Reasoning | Tools | Attachments |
|------|-------|-------|------|------|---------|---------|--------|----|----|-----------|-------|-------------|
| 1 | opencode/claude-opus-4-6 | 185 | 120 | 30 | 10 | 5 | 5 | 10 | 5 | ✓ | ✓ | ✓ |
| 2 | opencode/gpt-5.2-codex | 178 | 115 | 30 | 8 | 5 | 5 | 10 | 5 | ✓ | ✓ | ✓ |
| 3 | opencode/claude-sonnet-4-6 | 172 | 110 | 30 | 10 | 5 | 5 | 8 | 4 | ✓ | ✓ | ✓ |
...
```


---

**Note:** This script is for **visibility and debugging** — the installer will continue using its internal scoring. This just surfaces the same logic in a readable format.

```
```

