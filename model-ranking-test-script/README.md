# Model Ranking Test Script

A standalone TypeScript script that mirrors the exact scoring logic the installer uses to rank and select models for each agent role.

## Overview

This script provides visibility into how models are scored and ranked by the oh-my-opencode-slim plugin. It uses the same scoring engine (`rankModelsV1WithBreakdown`) that the installer uses internally, making it a perfect tool for:

- Debugging model selection decisions
- Understanding score breakdowns for each model
- Comparing scores across different agent roles
- Exporting results for analysis

## Installation

The script is located at `src/cli/score-models.ts` and is part of the main project.

### Prerequisites

1. **OpenCode installed** at `~/.config/opencode`
2. **Bun runtime** installed
3. **API keys** (optional but recommended):
   - `ARTIFICIAL_ANALYSIS_API_KEY` - For Artificial Analysis rankings
   - `OPENROUTER_API_KEY` - For OpenRouter pricing signals

## Usage

### Basic Usage

Score all models for all agent roles and output to stdout:

```bash
bun run src/cli/score-models.ts
```

### Filter by Role

Score only a specific agent role:

```bash
bun run src/cli/score-models.ts --role=oracle
bun run src/cli/score-models.ts --role=orchestrator
bun run src/cli/score-models.ts --role=designer
bun run src/cli/score-models.ts --role=explorer
bun run src/cli/score-models.ts --role=librarian
bun run src/cli/score-models.ts --role=fixer
```

### Output Formats

**Markdown (default):**

```bash
bun run src/cli/score-models.ts --format=md
```

**CSV (for spreadsheet analysis):**

```bash
bun run src/cli/score-models.ts --format=csv
```

### Save to File

```bash
# Save markdown output
bun run src/cli/score-models.ts --output=scores.md

# Save CSV output
bun run src/cli/score-models.ts --format=csv --output=scores.csv
```

### Combined Examples

```bash
# Score oracle role and save to CSV
bun run src/cli/score-models.ts --role=oracle --format=csv --output=oracle-scores.csv

# Score designer role with markdown output
bun run src/cli/score-models.ts --role=designer --format=md --output=designer-scores.md

# Score all roles with external signals
ARTIFICIAL_ANALYSIS_API_KEY=xxx OPENROUTER_API_KEY=yyy \
  bun run src/cli/score-models.ts --output=all-scores.md
```

### Help

```bash
bun run src/cli/score-models.ts --help
```

## Output Format

### Markdown Table

```markdown
## Oracle Agent Rankings

| Rank | Model | Total Score | Base Score | External Boost | Provider | Status |
|------|-------|-------------|------------|----------------|----------|--------|
| 1 | anthropic/claude-opus | 185 | 120 | 65 | anthropic | active |
| 2 | openai/gpt-4-turbo | 178 | 115 | 63 | openai | active |
| 3 | google/gemini-2-pro | 172 | 110 | 62 | google | active |
...
```

### CSV Format

```csv
Rank,Role,Model,Total Score,Base Score,External Boost,Provider,Status
1,oracle,anthropic/claude-opus,185,120,65,anthropic,active
2,oracle,openai/gpt-4-turbo,178,115,63,openai,active
3,oracle,google/gemini-2-pro,172,110,62,google,active
...
```

## Score Components

Each model receives a score composed of:

- **Base Score**: Calculated from model name heuristics, capabilities, and version recency
- **External Boost**: Additional points from external signals (Artificial Analysis + OpenRouter)
- **Total Score**: Sum of base score and external boost

### Scoring Factors

The base score considers:

- Model tier (premium, standard, budget)
- Reasoning capability
- Tool calling support
- Attachment support
- Context window size
- Output limit
- Release date recency

External signals add bonuses based on:

- Artificial Analysis quality and coding scores
- OpenRouter pricing information

## Environment Variables

### Optional API Keys

Set these to include external signals in scoring:

```bash
export ARTIFICIAL_ANALYSIS_API_KEY="your-api-key"
export OPENROUTER_API_KEY="your-api-key"
```

Or pass them inline:

```bash
ARTIFICIAL_ANALYSIS_API_KEY=xxx OPENROUTER_API_KEY=yyy \
  bun run src/cli/score-models.ts
```

### OpenCode Path

The script automatically looks for OpenCode at `~/.config/opencode`. If installed elsewhere, you may need to adjust the path in `src/cli/system.ts`.

## Troubleshooting

### "Unable to run `opencode models --refresh --verbose`"

**Cause**: OpenCode is not installed or not in the expected location.

**Solution**: Ensure OpenCode is installed at `~/.config/opencode` or update the path in `src/cli/system.ts`.

### "No models found in catalog"

**Cause**: The OpenCode models command returned no results.

**Solution**: Try running `opencode models --refresh --verbose` manually to verify OpenCode is working.

### Script takes a long time to run

**Cause**: The script needs to fetch the full model catalog from OpenCode, which can take 30+ seconds.

**Solution**: This is normal. The first run will be slower as it refreshes the catalog. Subsequent runs may be faster if OpenCode caches results.

### External signals not available

**Cause**: API keys are missing or the external services are unreachable.

**Solution**: The script will continue without external signals. Add API keys to include them in scoring.

## Implementation Details

### Architecture

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

### Key Functions

- `discoverModelCatalog()` - Fetches full model list from OpenCode
- `fetchExternalModelSignals()` - Gets external ranking signals
- `rankModelsV1WithBreakdown()` - Scores models using V1 engine

### Files

- `src/cli/score-models.ts` - Main script
- `src/cli/dynamic-model-selection.ts` - V1 scoring engine
- `src/cli/external-rankings.ts` - External signal fetching
- `src/cli/opencode-models.ts` - Model discovery

## Development

### Building

```bash
bun run build
```

### Type Checking

```bash
bun run typecheck
```

### Linting

```bash
bun run check:ci
```

### Running Tests

```bash
bun test
```

## Notes

- This script is for **visibility and debugging** only
- The installer continues using its internal scoring logic
- Scores may vary slightly based on external signal availability
- The script reuses existing functions from the codebase (no reimplementation)

## Related Documentation

- [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) - Technical implementation details
- [omocSLM-modelRankingTest.md](./omocSLM-modelRankingTest.md) - Original requirements
- [AGENTS.md](../AGENTS.md) - Project coding guidelines
