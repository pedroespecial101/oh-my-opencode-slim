# Provider Filtering - Explanation

## Why Does the Script Show All Models?

By default, `score-models.ts` shows **ALL models from the OpenCode catalog**, not just the ones you have configured/authorized.

### The Confusion

When you run:
```bash
opencode models --refresh --verbose
```

You see only models from providers you have configured (e.g., `opencode`, `github-copilot`, `kiro`, `perplexity`).

But when you run:
```bash
bun run src/cli/score-models.ts
```

You see models from ALL providers, including ones you don't have configured (e.g., `anthropic`, `google`, `openrouter`, etc.).

### Why This Happens

The script calls `discoverModelCatalog()` which runs:
```typescript
opencode models --refresh --verbose
```

And then parses the output with:
```typescript
parseOpenCodeModelsVerboseOutput(stdout, undefined, false)
//                                        ^^^^^^^^^ no provider filter
//                                                  ^^^^^ include paid models
```

OpenCode's `models --refresh --verbose` command returns the **full catalog** of available models, not just the ones you have configured. The script then shows all of them by default.

## Why This Is Intentional

Showing all models is useful for:

1. **Discovery**: See what models are available across all providers
2. **Comparison**: Compare scores across providers you don't have configured yet
3. **Decision Making**: Decide which providers to enable based on model scores
4. **Completeness**: Understand the full scoring landscape

## How to Filter by Active Providers

### Option 1: Use --providers Flag

```bash
# Filter to specific providers
bun run src/cli/score-models.ts --providers=opencode,github-copilot,kiro
```

Output:
```
Found 249 models
Filtered to 67 models from providers: opencode, github-copilot, kiro
```

### Option 2: Auto-Detect Active Providers

First, find your active providers:
```bash
opencode models --refresh --verbose | grep -E "^[a-z-]+/" | cut -d'/' -f1 | sort -u
```

Example output:
```
github-copilot
kiro
opencode
perplexity
```

Then use them:
```bash
bun run src/cli/score-models.ts --providers=github-copilot,kiro,opencode,perplexity
```

### Option 3: Create a Helper Script

Create `score-active.sh`:
```bash
#!/bin/bash
PROVIDERS=$(opencode models --refresh --verbose | grep -E "^[a-z-]+/" | cut -d'/' -f1 | sort -u | tr '\n' ',')
bun run src/cli/score-models.ts --providers="${PROVIDERS%,}" "$@"
```

Then run:
```bash
chmod +x score-active.sh
./score-active.sh --role=oracle
```

## Examples

### Show All Models (Default)

```bash
bun run src/cli/score-models.ts --role=oracle
```

Output:
```
Found 249 models
Scoring models...
oracle: 45/249 models have external boost
```

Shows models from: `opencode`, `anthropic`, `openai`, `google`, `github-copilot`, `kiro`, `openrouter`, etc.

### Show Only Active Providers

```bash
bun run src/cli/score-models.ts --role=oracle --providers=opencode,github-copilot,kiro
```

Output:
```
Found 249 models
Filtered to 67 models from providers: opencode, github-copilot, kiro
Scoring models...
oracle: 8/67 models have external boost
```

Shows only models from: `opencode`, `github-copilot`, `kiro`

### Show Single Provider

```bash
bun run src/cli/score-models.ts --role=oracle --providers=opencode
```

Output:
```
Found 249 models
Filtered to 45 models from providers: opencode
Scoring models...
oracle: 5/45 models have external boost
```

Shows only models from: `opencode`

## Understanding the Numbers

### Without Filtering

```
Found 249 models
```

This is the **full OpenCode catalog** - all models from all providers that OpenCode knows about.

### With Filtering

```
Found 249 models
Filtered to 67 models from providers: opencode, github-copilot, kiro
```

- **249 models**: Full catalog
- **67 models**: Only from your specified providers
- The other 182 models are from providers you don't have configured

## Technical Details

### How discoverModelCatalog() Works

```typescript
export async function discoverModelCatalog(): Promise<{
  models: DiscoveredModel[];
  error?: string;
}> {
  const proc = Bun.spawn([opencodePath, 'models', '--refresh', '--verbose'], {
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const stdout = await new Response(proc.stdout).text();
  
  return {
    models: parseOpenCodeModelsVerboseOutput(stdout, undefined, false),
    //                                               ^^^^^^^^^ no provider filter
  };
}
```

The `undefined` parameter means "don't filter by provider".

### How Filtering Works

```typescript
if (args.providers && args.providers.length > 0) {
  const providerSet = new Set(args.providers);
  models = models.filter((m) => providerSet.has(m.providerID));
  console.error(
    `Filtered to ${models.length} models from providers: ${args.providers.join(', ')}`,
  );
}
```

The script filters the full catalog down to only the providers you specify.

## Recommendation

For most use cases, **filter by your active providers**:

```bash
bun run src/cli/score-models.ts --providers=opencode,github-copilot,kiro
```

This gives you:
- Only models you can actually use
- Faster execution (fewer models to score)
- More relevant results
- Clearer output

## Related Documentation

- `README.md` - Full usage guide
- `QUICK_START.md` - Quick reference
- `FINAL_STATUS.md` - Implementation status
