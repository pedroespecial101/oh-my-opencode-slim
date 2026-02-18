# Quick Start Guide

## Installation

No installation needed! The script is part of the project.

## Basic Commands

### See all models ranked for all roles
```bash
bun run src/cli/score-models.ts
```

### See models ranked for a specific role
```bash
bun run src/cli/score-models.ts --role=oracle
```

### Save results to a file
```bash
bun run src/cli/score-models.ts --output=scores.md
```

### Export as CSV for spreadsheet analysis
```bash
bun run src/cli/score-models.ts --format=csv --output=scores.csv
```

### Get help
```bash
bun run src/cli/score-models.ts --help
```

## With API Keys (Optional)

For more accurate external signals:

```bash
ARTIFICIAL_ANALYSIS_API_KEY=your-key OPENROUTER_API_KEY=your-key \
  bun run src/cli/score-models.ts --output=scores.md
```

## Common Workflows

### Compare oracle vs orchestrator rankings
```bash
bun run src/cli/score-models.ts --role=oracle --output=oracle.md
bun run src/cli/score-models.ts --role=orchestrator --output=orchestrator.md
```

### Get all scores in one CSV file
```bash
bun run src/cli/score-models.ts --format=csv --output=all-scores.csv
```

### Check designer role scores
```bash
bun run src/cli/score-models.ts --role=designer
```

## Output

The script outputs:
- **Rank**: Position in the ranking
- **Model**: Model identifier (e.g., `anthropic/claude-opus`)
- **Total Score**: Final score (base + external boost)
- **Base Score**: Score from model capabilities
- **External Boost**: Score from external signals
- **Provider**: Model provider (e.g., `anthropic`)
- **Status**: Model status (e.g., `active`)

## Troubleshooting

**Script hangs or takes too long?**
- This is normal. First run can take 30-60 seconds as OpenCode refreshes the catalog.

**"Unable to run `opencode models`"?**
- Ensure OpenCode is installed at `~/.config/opencode`

**No external signals?**
- This is fine. The script works without API keys, just won't include external signals.

## Next Steps

- Read [README.md](./README.md) for detailed documentation
- Check [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for technical details
- Review [COMPLETION_SUMMARY.md](./COMPLETION_SUMMARY.md) for what was built
