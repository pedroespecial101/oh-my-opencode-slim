# External Boost Fix - Summary

## Problem

The `test.csv` output showed that every model had `External Boost = 0`, even though the script was supposed to fetch external signals from Artificial Analysis and OpenRouter APIs.

## Root Cause

**The .env file was in the wrong location.**

- The .env file was placed in `model-ranking-test-script/.env`
- Bun only loads `.env` files from the **project root directory**
- Therefore, the API keys were never loaded
- `fetchExternalModelSignals()` was called with `undefined` for both API keys
- The function gracefully returned an empty signals map `{}`
- `getExternalSignalBoost()` found no signals for any model
- Result: `externalSignalBoost = 0` for all models

## Investigation Process

### 1. Verified the Code Was Correct

Examined `src/cli/dynamic-model-selection.ts`:

```typescript
export type V1RankedScore = {
  model: string;
  totalScore: number;
  baseScore: number;
  externalSignalBoost: number;  // ✅ Field exists
};

export function rankModelsV1WithBreakdown(
  models: DiscoveredModel[],
  agent: AgentName,
  externalSignals?: ExternalSignalMap,
): V1RankedScore[] {
  const versionRecencyMap = getVersionRecencyMap(models);
  return [...models]
    .map((model) => {
      const base = roleScore(agent, model, versionRecencyMap[model.model] ?? 0);
      const boost = getExternalSignalBoost(agent, model, externalSignals);  // ✅ Calculated
      return {
        model: model.model,
        baseScore: Math.round(base * 1000) / 1000,
        externalSignalBoost: Math.round(boost * 1000) / 1000,  // ✅ Included
        totalScore: Math.round((base + boost) * 1000) / 1000,
      };
    })
    // ...
}
```

The code was correct. The `externalSignalBoost` field is real and properly calculated.

### 2. Added Debugging

Added logging to `src/cli/score-models.ts`:

```typescript
// Debug: Log signal information
const signalKeys = Object.keys(signals);
console.error(`External signals fetched: ${signalKeys.length} entries`);
if (signalKeys.length > 0) {
  console.error(`Sample signal keys: ${signalKeys.slice(0, 5).join(', ')}`);
}
```

Output showed:
```
External signals fetched: 0 entries
```

This confirmed that no signals were being fetched.

### 3. Identified the Issue

- No warnings were shown (API calls didn't fail)
- Signal count was 0 (no data fetched)
- This meant the API keys were `undefined`
- Checked `.env` file location: `model-ranking-test-script/.env` ❌
- Bun only loads from project root: `./.env` ✅

## Solution

### 1. Move .env to Project Root

```bash
mv model-ranking-test-script/.env .env
```

### 2. Added Better Error Messages

Updated `src/cli/score-models.ts` to warn when API keys are missing:

```typescript
const aaKey = getEnv('ARTIFICIAL_ANALYSIS_API_KEY');
const orKey = getEnv('OPENROUTER_API_KEY');

if (!aaKey && !orKey) {
  console.error(
    'Warning: No API keys found. External signals will not be available.',
  );
  console.error(
    'Set ARTIFICIAL_ANALYSIS_API_KEY and/or OPENROUTER_API_KEY environment variables.',
  );
}
```

### 3. Added Documentation

Created:
- `ENV_SETUP.md` - Detailed environment variable setup guide
- Updated `README.md` - Added warning about .env location
- This file (`EXTERNAL_BOOST_FIX.md`) - Explanation of the issue

### 4. Added Comments

Added comments to formatting functions explaining how external boost is calculated:

```typescript
// Format results as markdown table
// External Boost comes from rankModelsV1WithBreakdown's externalSignalBoost field,
// which is calculated by getExternalSignalBoost() based on:
// - Artificial Analysis quality and coding scores
// - OpenRouter pricing information
// - Model latency data
// If external signals are unavailable or model keys don't match, boost will be 0.
```

## How External Boost Works

### Calculation (from `getExternalSignalBoost`)

For most agents (oracle, orchestrator, designer, librarian, fixer):
```typescript
const qualityBoost = qualityScore * 0.16;
const codingBoost = codingScore * 0.24;
const latencyPenalty = Math.min(latencySeconds, 25) * 0.22;
const pricePenalty = Math.min(blendedPrice, 30) * 0.08;
const boost = qualityBoost + codingBoost - latencyPenalty - pricePenalty;
return Math.max(-30, Math.min(45, boost));  // Clamped to [-30, 45]
```

For explorer agent (speed-focused):
```typescript
const qualityBoost = qualityScore * 0.05;
const codingBoost = codingScore * 0.08;
const latencyPenalty = Math.min(latencySeconds, 12) * 3.2 + (latencySeconds > 7 ? 16 : latencySeconds > 4 ? 10 : 0);
const pricePenalty = Math.min(blendedPrice, 30) * 0.03;
const qualityFloorPenalty = qualityScore > 0 && qualityScore < 35 ? (35 - qualityScore) * 0.8 : 0;
const boost = qualityBoost + codingBoost - latencyPenalty - pricePenalty - qualityFloorPenalty;
return Math.max(-90, Math.min(25, boost));  // Clamped to [-90, 25]
```

### Model Key Matching

The function uses `modelLookupKeys()` to generate aliases for each model:
- `openai/gpt-4-turbo` → `['openai/gpt-4-turbo', 'gpt-4-turbo', 'gpt4turbo', ...]`
- Tries each alias to find a match in the signals map
- If no match found, boost = 0

## Verification

After moving .env to the root and setting valid API keys:

```bash
bun run src/cli/score-models.ts --role=oracle
```

Expected output:
```
Fetching external signals...
External signals fetched: 150+ entries
Sample signal keys: anthropic/claude-opus, openai/gpt-4-turbo, ...
Scoring models...
oracle: 45/67 models have external boost
```

Models should now show non-zero External Boost values based on their AA/OR data.

## Key Takeaways

1. **The script implementation was correct** - it properly uses `rankModelsV1WithBreakdown` and the `externalSignalBoost` field
2. **The issue was environmental** - .env file in wrong location
3. **Bun's .env loading is root-only** - subdirectory .env files are ignored
4. **Better error messages help** - now warns when API keys are missing
5. **External boost is optional** - script works without it, just shows 0 for all models

## Related Files

- `src/cli/score-models.ts` - Main script (updated with warnings)
- `src/cli/dynamic-model-selection.ts` - Scoring engine (unchanged, was correct)
- `src/cli/external-rankings.ts` - Signal fetching (unchanged, was correct)
- `model-ranking-test-script/ENV_SETUP.md` - Setup guide (new)
- `model-ranking-test-script/README.md` - Updated with .env warning
