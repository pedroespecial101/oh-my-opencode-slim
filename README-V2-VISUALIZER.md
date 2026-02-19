# V2 Scoring Visualizer

A standalone diagnostic tool to visualize the V2 model scoring system.

## Quick Start

### 1. Generate Scoring Data

```bash
bun run src/cli/scoring-v2/dump-v2-scores.ts
```

This will create `scoring-v2-dump.json` in the project root.

### 2. Start Local Server

```bash
python3 -m http.server 8000
```

### 3. Open Visualizer

Open your browser to: http://localhost:8000/scoring-visualiser.html

## Requirements

- API keys in `.env` file:
  - `ARTIFICIAL_ANALYSIS_API_KEY`
  - `OPENROUTER_API_KEY`

## Features

### Tab 1: Weights Matrix
View how each agent type weights different features.

### Tab 2: Raw Data
See raw model data before normalization.

### Tab 3: Normalized Features
Understand how raw data is transformed before scoring.

### Tab 4: V2 Scores & Rankings
See final scores and rankings for each agent role.

### Tab 5: Hardcodes & Gotchas
Understand hardcoded adjustments and scoring system limitations.

## Filters

- **Agent Filter**: Focus on specific agent scoring behavior
- **Signal Filter**: Hide models without external signals

## Troubleshooting

If the visualizer shows an error:
1. Ensure you've run the data generator script
2. Check that `scoring-v2-dump.json` exists in project root
3. Verify API keys are set in `.env`
4. Check browser console for errors
