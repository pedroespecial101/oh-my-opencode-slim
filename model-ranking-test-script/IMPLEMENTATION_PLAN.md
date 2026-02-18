# Model Ranking Test Script - Implementation Plan

## Overview
Create a standalone TypeScript script (`src/cli/score-models.ts`) that mirrors the exact scoring logic the installer uses to rank and select models for each agent role. This script will provide visibility into how models are scored and ranked.

## Objectives
1. Read the model catalog using existing `discoverModelCatalog()` function
2. Fetch external signals (Artificial Analysis + OpenRouter)
3. Run the V1 scoring engine (`rankModelsV1WithBreakdown`)
4. Output detailed tables with full score breakdowns for all models
5. Support CLI options for filtering by role and output format

## Architecture

### Input Pipeline
```
discoverModelCatalog()
    ↓
DiscoveredModel[]
    ↓
fetchExternalModelSignals()
    ↓
ExternalSignalMap
    ↓
rankModelsV1WithBreakdown() [for each role]
    ↓
V1RankedScore[]
    ↓
Format & Output
```

### Key Functions to Use (No Reimplementation)
- `discoverModelCatalog()` from `src/cli/opencode-models.ts` - Fetch full model list
- `fetchExternalModelSignals()` from `src/cli/external-rankings.ts` - Get AA + OpenRouter signals
- `rankModelsV1WithBreakdown()` from `src/cli/dynamic-model-selection.ts` - Score models per role

### Types
- `DiscoveredModel` - Model metadata (context, output, capabilities, costs)
- `ExternalSignalMap` - External ranking signals
- `V1RankedScore` - Scoring result: `{ model, totalScore, baseScore, externalSignalBoost }`
- `AgentName` - Role type: 'oracle' | 'orchestrator' | 'designer' | 'explorer' | 'librarian' | 'fixer'

## Implementation Steps

### Phase 1: Core Script Structure
1. Create `src/cli/score-models.ts` with:
   - Main async function to orchestrate scoring
   - CLI argument parsing (--role, --output, --format)
   - Error handling for missing OpenCode or API keys

### Phase 2: Data Collection
1. Call `discoverModelCatalog()` to get all models
2. Call `fetchExternalModelSignals()` with optional API keys from environment
3. Handle warnings from external signal fetching gracefully

### Phase 3: Scoring Loop
1. Define agent roles: `['oracle', 'orchestrator', 'designer', 'explorer', 'librarian', 'fixer']`
2. For each role (or filtered role):
   - Call `rankModelsV1WithBreakdown(models, role, signals)`
   - Collect results with role metadata

### Phase 4: Output Formatting
1. Markdown table format (default):
   - Columns: Rank | Model | Total Score | Base Score | External Boost | Provider | Status
   - Sorted by score descending within each role
   - Section headers for each role

2. CSV format (optional):
   - Same columns as markdown
   - One row per model per role
   - Suitable for spreadsheet analysis

### Phase 5: CLI Integration
1. Parse arguments:
   - `--role=<role>` - Filter to specific role (default: all)
   - `--output=<file>` - Write to file (default: stdout)
   - `--format=<csv|md>` - Output format (default: markdown)
   - `--help` - Show usage

2. Exit codes:
   - 0: Success
   - 1: Missing OpenCode or model discovery failed
   - 2: Invalid arguments

## Data Flow Example

### Input
```typescript
// Models from catalog
[
  { model: 'openai/gpt-4-turbo', contextLimit: 128000, reasoning: true, ... },
  { model: 'anthropic/claude-opus', contextLimit: 200000, reasoning: true, ... },
  ...
]

// External signals
{
  'openai/gpt-4-turbo': { qualityScore: 92, codingScore: 88, ... },
  'anthropic/claude-opus': { qualityScore: 95, codingScore: 91, ... },
  ...
}
```

### Processing (for oracle role)
```typescript
rankModelsV1WithBreakdown(models, 'oracle', signals)
// Returns:
[
  {
    model: 'anthropic/claude-opus',
    totalScore: 185,
    baseScore: 120,
    externalSignalBoost: 65
  },
  {
    model: 'openai/gpt-4-turbo',
    totalScore: 178,
    baseScore: 115,
    externalSignalBoost: 63
  },
  ...
]
```

### Output (Markdown)
```markdown
## Oracle Agent Rankings

| Rank | Model | Total Score | Base Score | External Boost | Provider | Status |
|------|-------|-------------|------------|----------------|----------|--------|
| 1 | anthropic/claude-opus | 185 | 120 | 65 | anthropic | active |
| 2 | openai/gpt-4-turbo | 178 | 115 | 63 | openai | active |
| 3 | google/gemini-2-pro | 172 | 110 | 62 | google | active |
...
```

## File Structure
```
model-ranking-test-script/
├── omocSLM-modelRankingTest.md    (existing requirements)
├── IMPLEMENTATION_PLAN.md          (this file)
└── [future: test results, sample outputs]

src/cli/
├── score-models.ts                 (new script)
├── dynamic-model-selection.ts      (existing - scoring engine)
├── external-rankings.ts            (existing - external signals)
├── opencode-models.ts              (existing - model discovery)
└── types.ts                        (existing - type definitions)
```

## CLI Usage Examples

```bash
# Score all models for all roles, output to stdout
bun run src/cli/score-models.ts

# Score only oracle role
bun run src/cli/score-models.ts --role=oracle

# Score all roles, save to CSV
bun run src/cli/score-models.ts --format=csv --output=scores.csv

# Score designer role with external signals
ARTIFICIAL_ANALYSIS_API_KEY=xxx OPENROUTER_API_KEY=yyy \
  bun run src/cli/score-models.ts --role=designer --format=md

# Show help
bun run src/cli/score-models.ts --help
```

## Error Handling Strategy

1. **Missing OpenCode**: Graceful error message, exit code 1
2. **Model discovery fails**: Show error, suggest running `opencode models --refresh`
3. **External signals unavailable**: Continue with empty signals, show warnings
4. **Invalid role**: Show available roles and exit
5. **File write errors**: Show error and exit code 1

## Validation Checklist

After implementation:
- [ ] Script runs without errors: `bun run src/cli/score-models.ts`
- [ ] Produces markdown output by default
- [ ] CSV format works: `--format=csv`
- [ ] Role filtering works: `--role=oracle`
- [ ] File output works: `--output=test.md`
- [ ] Top-ranked models match installer selections
- [ ] Score breakdowns are mathematically correct
- [ ] Handles missing API keys gracefully
- [ ] Passes `bun run check:ci` (linting/formatting)
- [ ] Passes `bun run typecheck` (type checking)
- [ ] No console errors or warnings

## Success Criteria

✅ Script imports and calls existing scoring functions (no reimplementation)
✅ Outputs full catalog with scores for all roles
✅ Score columns show how each component was calculated
✅ Top-ranked models match what the installer would select
✅ Can export to both markdown and CSV formats
✅ Handles missing external signals gracefully
✅ Follows AGENTS.md code style guidelines
✅ Passes all linting and type checks

## Next Steps

1. Create `src/cli/score-models.ts` with core structure
2. Implement data collection phase
3. Implement scoring loop
4. Implement output formatters (markdown + CSV)
5. Add CLI argument parsing
6. Test with various role filters and output formats
7. Verify scores match installer logic
8. Run code review before committing
