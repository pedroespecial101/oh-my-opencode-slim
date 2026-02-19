# V2 Scoring Visualizer - Design Document

## Architecture Overview

This feature consists of two independent deliverables:

1. **Data Generator** (`src/cli/scoring-v2/dump-v2-scores.ts`) - TypeScript CLI script
2. **Visualizer** (`scoring-visualiser.html`) - Self-contained HTML file

```
┌─────────────────────────────────────────────────────────────┐
│                    Data Flow                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  .env (API keys)                                            │
│       │                                                      │
│       ▼                                                      │
│  dump-v2-scores.ts                                          │
│       │                                                      │
│       ├──► discoverModelCatalog()                           │
│       ├──► fetchExternalModelSignals()                      │
│       ├──► getFeatureWeights() × 6 agents                   │
│       └──► scoreCandidateV2() × models × agents             │
│                │                                             │
│                ▼                                             │
│       scoring-v2-dump.json                                  │
│                │                                             │
│                ▼                                             │
│       scoring-visualiser.html                               │
│                │                                             │
│                └──► 5 Interactive Tabs                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Deliverable 1: Data Generator

### File: `src/cli/scoring-v2/dump-v2-scores.ts`

#### Purpose
Generate a comprehensive JSON dump of all V2 scoring data for visualization.

#### Dependencies
```typescript
import { discoverModelCatalog } from '../opencode-models';
import { fetchExternalModelSignals } from '../external-rankings';
import { getFeatureWeights } from './weights';
import { scoreCandidateV2 } from './engine';
import type { ScoringAgentName } from './types';
```

#### Algorithm

```typescript
async function main() {
  // 1. Validate API keys from .env
  const aaKey = process.env.ARTIFICIAL_ANALYSIS_API_KEY;
  const orKey = process.env.OPENROUTER_API_KEY;
  
  if (!aaKey || !orKey) {
    throw new Error('Missing required API keys in .env');
  }

  // 2. Discover models
  const { models, error } = await discoverModelCatalog();
  if (error) throw new Error(error);
  
  // 3. Filter to exclude deprecated models only
  // Include active, beta, and alpha - all are real usable models
  // Exclude deprecated - these are dead models not available for use
  // Note: 'inactive' status doesn't exist in DiscoveredModel type
  const activeModels = models.filter(m => m.status !== 'deprecated');
  
  // Log for verification
  console.log(`Discovered ${activeModels.length} models (active, beta, alpha)`);
  const providers = [...new Set(activeModels.map(m => m.providerID))];
  console.log(`Providers: ${providers.join(', ')}`);
  
  // Validation: Compare against opencode models --refresh
  // This safeguards against catalog bugs (e.g., OpenRouter models appearing)
  console.log('Validating against opencode models --refresh...');
  // TODO: Add validation logic in implementation

  // 4. Fetch external signals
  // Note: OpenRouter API is used for signals only, not as a model provider
  const { signals, warnings } = await fetchExternalModelSignals({
    artificialAnalysisApiKey: aaKey,
    openRouterApiKey: orKey,
  });
  
  // Log warnings but continue (non-fatal)
  warnings.forEach(w => console.warn(`⚠ ${w}`));
  
  // Log missing signals for each model
  activeModels.forEach(model => {
    const signal = findSignalForModel(model, signals);
    if (!signal) {
      console.warn(`⚠ No external signal found for: ${model.model}`);
    }
  });

  // 5. Build output structure
  const agentTypes: ScoringAgentName[] = [
    'orchestrator', 'oracle', 'designer', 
    'explorer', 'librarian', 'fixer'
  ];

  // 6. Capture weights for all agents
  const weights = {};
  for (const agent of agentTypes) {
    weights[agent] = getFeatureWeights(agent);
  }

  // 7. Score each model × agent combination
  const modelsOutput = activeModels.map(model => {
    const byAgent = {};
    
    for (const agent of agentTypes) {
      const scored = scoreCandidateV2(model, agent, signals);
      byAgent[agent] = {
        features: scored.scoreBreakdown.features,
        weighted: scored.scoreBreakdown.weighted,
        totalScore: scored.totalScore,
      };
    }

    // Find external signal for this model
    const signal = findSignalForModel(model, signals);

    return {
      id: model.model,
      name: model.name,
      providerID: model.providerID,
      status: model.status,
      rawData: {
        contextLimit: model.contextLimit,
        outputLimit: model.outputLimit,
        reasoning: model.reasoning,
        toolcall: model.toolcall,
        attachment: model.attachment,
      },
      externalSignals: signal ? {
        present: true,
        latencySeconds: signal.latencySeconds ?? null,
        qualityScore: signal.qualityScore ?? null,
        codingScore: signal.codingScore ?? null,
        inputPricePer1M: signal.inputPricePer1M ?? null,
        outputPricePer1M: signal.outputPricePer1M ?? null,
      } : {
        present: false,
        latencySeconds: null,
        qualityScore: null,
        codingScore: null,
        inputPricePer1M: null,
        outputPricePer1M: null,
      },
      byAgent,
    };
  });

  // 8. Write output
  const output = {
    generatedAt: new Date().toISOString(),
    agentTypes,
    hasExternalSignals: {
      artificialAnalysis: !!aaKey,
      openRouter: !!orKey,
    },
    weights,
    models: modelsOutput,
  };

  await Bun.write('scoring-v2-dump.json', JSON.stringify(output, null, 2));
  console.log('✓ Generated scoring-v2-dump.json');
}

main().catch(console.error);
```

#### Helper Function
```typescript
function findSignalForModel(model, signals) {
  // Use same logic as features.ts
  const keys = buildModelKeyAliases(model.model);
  for (const key of keys) {
    if (signals[key]) return signals[key];
  }
  return undefined;
}
```

#### Output Schema

```typescript
interface DumpOutput {
  generatedAt: string; // ISO timestamp
  agentTypes: ScoringAgentName[];
  hasExternalSignals: {
    artificialAnalysis: boolean;
    openRouter: boolean;
  };
  weights: Record<ScoringAgentName, FeatureWeights>;
  models: ModelDump[];
}

interface ModelDump {
  id: string; // e.g., "anthropic/claude-opus-4"
  name: string;
  providerID: string;
  status: 'alpha' | 'beta' | 'active';
  rawData: {
    contextLimit: number;
    outputLimit: number;
    reasoning: boolean;
    toolcall: boolean;
    attachment: boolean;
  };
  externalSignals: {
    present: boolean;
    latencySeconds: number | null;
    qualityScore: number | null;
    codingScore: number | null;
    inputPricePer1M: number | null;
    outputPricePer1M: number | null;
  };
  byAgent: Record<ScoringAgentName, {
    features: FeatureVector;
    weighted: FeatureVector;
    totalScore: number;
  }>;
}
```

## Deliverable 2: HTML Visualizer

### File: `scoring-visualiser.html`

#### Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>V2 Scoring Visualiser</title>
  <style>/* Inline CSS */</style>
</head>
<body>
  <header id="global-header">
    <!-- Sticky header with filters -->
  </header>
  
  <nav id="tab-nav">
    <!-- Tab buttons -->
  </nav>
  
  <main id="content">
    <div id="tab-weights" class="tab-content">...</div>
    <div id="tab-raw" class="tab-content">...</div>
    <div id="tab-normalized" class="tab-content">...</div>
    <div id="tab-scores" class="tab-content">...</div>
    <div id="tab-hardcodes" class="tab-content">...</div>
  </main>
  
  <script>/* Inline JavaScript */</script>
</body>
</html>
```

#### Global State Management

```javascript
const state = {
  data: null, // Loaded JSON
  activeTab: 'weights',
  agentFilter: 'all', // 'all' | agent name
  hideNoSignals: false,
};

function setState(updates) {
  Object.assign(state, updates);
  render();
}
```

#### Tab 1: Weights Matrix

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Feature Description │ BASE │ Orch │ Oracle │ Design │ ... │
├─────────────────────────────────────────────────────────────┤
│ Status              │  22  │  22  │   22   │   22   │ ... │
│ Context Window      │   6  │   6  │    6   │    6   │ ... │
│ Output Limit        │   6  │   6  │    7   │   10   │ ... │
│ ...                                                          │
└─────────────────────────────────────────────────────────────┘
```

**Feature Descriptions:**
```javascript
const featureDescriptions = {
  status: 'Model maturity level (active=1, beta=0.4, alpha=-0.25)',
  context: 'Context window size normalized to 100K tokens',
  output: 'Output limit normalized to 30K tokens',
  versionBonus: 'Hardcoded adjustments for specific model versions',
  reasoning: 'Extended reasoning capability (1 if true, 0 if false)',
  toolcall: 'Function calling capability (1 if true, 0 if false)',
  attachment: 'File attachment support (1 if true, 0 if false)',
  quality: 'External quality score normalized 0-1',
  coding: 'External coding score normalized 0-1',
  latencyPenalty: 'Time to first token penalty (negative)',
  pricePenalty: 'Blended pricing penalty (negative)',
};
```

**Heatmap Logic:**
```javascript
function getHeatmapColor(value, isNegative) {
  const absValue = Math.abs(value);
  const maxWeight = 28; // Max observed weight
  const intensity = Math.min(absValue / maxWeight, 1);
  
  if (isNegative) {
    // Red gradient: rgb(255, 200-intensity*150, 200-intensity*150)
    const component = Math.round(200 - intensity * 150);
    return `rgb(255, ${component}, ${component})`;
  } else {
    // Blue gradient: rgb(200-intensity*150, 200-intensity*150, 255)
    const component = Math.round(200 - intensity * 150);
    return `rgb(${component}, ${component}, 255)`;
  }
}
```

**Highlighting Logic:**
```javascript
function shouldHighlightCell(agent, feature, baseWeight, agentWeight) {
  return baseWeight !== agentWeight;
}

function shouldBoldColumn(agent, activeFilter) {
  return activeFilter !== 'all' && activeFilter === agent;
}
```

#### Tab 2: Raw Data

**Columns:**
1. Model ID
2. Provider
3. Status
4. Context (K tokens) - `contextLimit / 1000`
5. Output (K tokens) - `outputLimit / 1000`
6. Reasoning - ✓/✗
7. Toolcall - ✓/✗
8. Attachment - ✓/✗
9. Latency (s) - amber bg if null
10. Quality Score - amber bg if null
11. Coding Score - amber bg if null
12. Input $/1M - amber bg if null
13. Output $/1M - amber bg if null

**Column Highlighting:**
```javascript
function getRelevantColumns(agent, weights) {
  // Get top 3 weighted features for this agent
  const agentWeights = weights[agent];
  const sorted = Object.entries(agentWeights)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 3)
    .map(([feature]) => feature);
  
  // Map features to column names
  const columnMap = {
    context: 'Context (K tokens)',
    output: 'Output (K tokens)',
    reasoning: 'Reasoning',
    toolcall: 'Toolcall',
    attachment: 'Attachment',
    quality: 'Quality Score',
    coding: 'Coding Score',
    latencyPenalty: 'Latency (s)',
    pricePenalty: 'Input $/1M', // Approximate
  };
  
  return sorted.map(f => columnMap[f]).filter(Boolean);
}
```

#### Tab 3: Normalized Features

**Columns:** All 11 features from `FeatureVector`

**Heatmap Logic:**
```javascript
function getNormalizedHeatmap(value, columnValues) {
  const max = Math.max(...columnValues.map(Math.abs));
  const intensity = Math.abs(value) / max;
  
  if (value < 0) {
    const component = Math.round(200 - intensity * 150);
    return `rgb(255, ${component}, ${component})`;
  } else {
    const component = Math.round(200 - intensity * 150);
    return `rgb(${component}, ${component}, 255)`;
  }
}
```

**Tooltips:**
```javascript
const normalizationFormulas = {
  status: 'active=1, beta=0.4, alpha=-0.25, other=-1',
  context: 'min(contextLimit, 1M) / 100K',
  output: 'designer: <64K ? -1 : 0; others: min(outputLimit, 300K) / 30K',
  versionBonus: 'Hardcoded per model/agent (see Tab 5)',
  reasoning: 'boolean ? 1 : 0',
  toolcall: 'boolean ? 1 : 0',
  attachment: 'boolean ? 1 : 0',
  quality: 'qualityScore / 100',
  coding: 'codingScore / 100',
  latencyPenalty: 'min(latency, 20) × (explorer ? 1.4 : 1)',
  pricePenalty: 'min(blendedPrice, 50) / 10',
};
```

#### Tab 4: V2 Scores & Rankings

**Columns:**
1. Rank
2. Model
3. Provider
4. Status (weighted)
5. Context (weighted)
6. Output (weighted)
7. Version Bonus (weighted)
8. Reasoning (weighted)
9. Toolcall (weighted)
10. Attachment (weighted)
11. Quality (weighted)
12. Coding (weighted)
13. Latency Penalty (weighted)
14. Price Penalty (weighted)
15. **Total Score** (with bar chart)

**Bar Chart SVG:**
```javascript
function createBarChart(score, maxScore) {
  const width = 100; // pixels
  const height = 16;
  const barWidth = (score / maxScore) * width;
  
  return `
    <svg width="${width}" height="${height}" style="vertical-align: middle;">
      <rect x="0" y="0" width="${width}" height="${height}" 
            fill="#e0e0e0" rx="2"/>
      <rect x="0" y="0" width="${barWidth}" height="${height}" 
            fill="#4CAF50" rx="2"/>
      <text x="${width/2}" y="${height/2 + 4}" 
            text-anchor="middle" font-size="11" fill="#333">
        ${score.toFixed(1)}
      </text>
    </svg>
  `;
}
```

**Expandable Row:**
```javascript
function createComparisonChart(model, topModel, agent) {
  const features = Object.keys(model.byAgent[agent].weighted);
  const bars = features.map(feature => {
    const modelValue = model.byAgent[agent].weighted[feature];
    const topValue = topModel.byAgent[agent].weighted[feature];
    const maxValue = Math.max(Math.abs(modelValue), Math.abs(topValue));
    
    return `
      <div class="feature-comparison">
        <span class="feature-name">${feature}</span>
        <div class="bar-container">
          <div class="bar model-bar" 
               style="width: ${Math.abs(modelValue)/maxValue*100}%">
            ${modelValue.toFixed(2)}
          </div>
          <div class="bar top-bar" 
               style="width: ${Math.abs(topValue)/maxValue*100}%">
            ${topValue.toFixed(2)}
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  return `<div class="expanded-row">${bars}</div>`;
}
```

#### Tab 5: Hardcodes & Gotchas

**Section A: V2 Feature Hardcodes**

From `src/cli/scoring-v2/features.ts`:

| Pattern | Provider | Affected Agents | Effect | Risk |
|---------|----------|-----------------|--------|------|
| `/qwen3/` | chutes | All | -6 to -12 (varies) | Model name change breaks match |
| `/kimi-k2\.5\|k2\.5/` | Any | All | +1 to +3 (varies) | Underscore variant `kimi_k2_5` not matched |
| `/minimax[-_ ]?m2\.1/` | chutes | All | +1 to +4 (varies) | Dot variant `minimax.m2.1` not matched |
| `agent === 'explorer'` | N/A | Explorer | latency × 1.4 | Hardcoded multiplier |
| `outputLimit < 64000` | N/A | Designer | -1 penalty | Arbitrary threshold |

**Section B: Known Pattern-Match Risks**

```
Model Naming Variations That Break Matching:
- qwen3 vs qwen-3 vs qwen_3
- kimi-k2.5 vs kimi_k2_5 vs kimi-k2-5
- minimax-m2.1 vs minimax_m2.1 vs minimax.m2.1
- Case sensitivity: QWEN3 vs qwen3
- Whitespace: "kimi k2.5" vs "kimi-k2.5"
```

**Section C: V2 Scoring Scope Notes**

```
This visualizer shows ONLY V2 scoring output - the objective 
evaluation of model quality for each agent role.

The actual installation pipeline applies additional post-scoring 
policy logic that can override these scores:
- Provider diversity balancing
- Subscription availability checks
- Manual user model pins
- Fallback chain construction

This policy logic is intentionally excluded because this tool's 
purpose is evaluating model quality, not installation policy.

For the complete model selection logic, see:
- src/cli/dynamic-model-selection.ts (policy engine)
- src/cli/precedence-resolver.ts (resolution layers)
```

#### CSS Design System

```css
:root {
  --color-primary: #2196F3;
  --color-positive: #4CAF50;
  --color-negative: #f44336;
  --color-warning: #ff9800;
  --color-bg: #ffffff;
  --color-bg-alt: #f5f5f5;
  --color-border: #e0e0e0;
  --color-text: #333333;
  --color-text-muted: #757575;
  
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  
  --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 
                 Roboto, Oxygen, Ubuntu, sans-serif;
  --font-size-sm: 12px;
  --font-size-base: 14px;
  --font-size-lg: 16px;
  --font-size-xl: 20px;
}

body {
  margin: 0;
  padding: 0;
  font-family: var(--font-family);
  font-size: var(--font-size-base);
  color: var(--color-text);
  background: var(--color-bg);
}

#global-header {
  position: sticky;
  top: 0;
  background: var(--color-bg);
  border-bottom: 2px solid var(--color-border);
  padding: var(--spacing-md);
  z-index: 100;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

th, td {
  padding: var(--spacing-sm);
  text-align: left;
  border: 1px solid var(--color-border);
}

th {
  background: var(--color-bg-alt);
  font-weight: 600;
  position: sticky;
  top: 60px; /* Below header */
}

.tab-content {
  display: none;
  padding: var(--spacing-lg);
}

.tab-content.active {
  display: block;
}

.missing-signal {
  background: var(--color-warning) !important;
  color: var(--color-text);
}
```

## Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│ dump-v2-scores.ts Execution Flow                             │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ 1. Load .env                                                 │
│    ├─ ARTIFICIAL_ANALYSIS_API_KEY                            │
│    └─ OPENROUTER_API_KEY                                     │
│                                                               │
│ 2. discoverModelCatalog()                                    │
│    └─ Calls: opencode models --refresh --verbose            │
│                                                               │
│ 3. Filter models                                             │
│    └─ Exclude: status === 'deprecated' only                 │
│    └─ Include: active, beta, alpha (all usable models)      │
│                                                               │
│ 4. fetchExternalModelSignals()                               │
│    ├─ Artificial Analysis API                                │
│    └─ OpenRouter API                                         │
│                                                               │
│ 5. For each agent type:                                      │
│    └─ getFeatureWeights(agent)                               │
│                                                               │
│ 6. For each model × agent:                                   │
│    ├─ extractFeatureVector()                                 │
│    ├─ weightedFeatures()                                     │
│    └─ sumFeatures() → totalScore                             │
│                                                               │
│ 7. Write JSON                                                │
│    └─ scoring-v2-dump.json                                   │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

## Error Handling

### Data Generator Errors

```typescript
// Missing API keys
if (!process.env.ARTIFICIAL_ANALYSIS_API_KEY) {
  throw new Error(
    'ARTIFICIAL_ANALYSIS_API_KEY not found in .env file'
  );
}

// Model discovery failure
const { models, error } = await discoverModelCatalog();
if (error) {
  throw new Error(`Failed to discover models: ${error}`);
}

// External signal fetch warnings (non-fatal)
const { signals, warnings } = await fetchExternalModelSignals(...);
warnings.forEach(w => console.warn(`⚠ ${w}`));
```

### HTML Visualizer Errors

```javascript
// JSON load failure
fetch('./scoring-v2-dump.json')
  .then(r => r.json())
  .catch(err => {
    document.body.innerHTML = `
      <div class="error">
        <h1>Failed to load scoring data</h1>
        <p>Make sure you've run: 
           <code>bun run src/cli/scoring-v2/dump-v2-scores.ts</code>
        </p>
        <p>Error: ${err.message}</p>
      </div>
    `;
  });

// Invalid data structure
if (!data.models || !data.weights) {
  throw new Error('Invalid JSON structure');
}
```

## Performance Considerations

### Data Generator
- Expected runtime: 10-20 seconds
- Bottleneck: External API calls (8s timeout each)
- Optimization: Parallel API calls using `Promise.allSettled()`

### HTML Visualizer
- Initial load: < 2s for ~100 models
- Tab switching: < 100ms (hide/show DOM elements)
- Filtering: < 200ms (CSS display property)
- Sorting: < 300ms (array sort + re-render)

### Memory Usage
- JSON file size: ~500KB for 100 models
- DOM nodes: ~5000 for all tabs
- Memory footprint: < 50MB

## Testing Strategy

### Manual Testing Checklist

**Data Generator:**
- [ ] Runs successfully with valid API keys
- [ ] Throws error with missing API keys
- [ ] Handles API timeout gracefully
- [ ] Filters deprecated/inactive models
- [ ] Generates valid JSON structure
- [ ] All 11 features present in output
- [ ] All 6 agents present in output

**HTML Visualizer:**
- [ ] Loads JSON successfully
- [ ] All 5 tabs render correctly
- [ ] Agent filter affects all tabs
- [ ] Signal filter hides models correctly
- [ ] Heatmaps display with correct colors
- [ ] Bar charts scale correctly
- [ ] Expandable rows work in Tab 4
- [ ] Tooltips display on hover
- [ ] Works in Chrome, Firefox, Safari

## Deployment

### Build Steps
```bash
# 1. Generate data
bun run src/cli/scoring-v2/dump-v2-scores.ts

# 2. Start local server
python3 -m http.server 8000

# 3. Open browser
open http://localhost:8000/scoring-visualiser.html
```

### Files Generated
- `scoring-v2-dump.json` (project root, gitignored)
- `scoring-visualiser.html` (project root, committed)

### Git Configuration
Add to `.gitignore`:
```
scoring-v2-dump.json
```

## Future Enhancements (Out of Scope)

- Export to CSV/PDF
- Historical comparison across runs
- Real-time data refresh
- Custom weight adjustment UI
- Model-to-model comparison
- Mobile responsive design
- Dark mode theme
