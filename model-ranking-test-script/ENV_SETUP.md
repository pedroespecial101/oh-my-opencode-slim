# Environment Variable Setup

## Important: .env File Location

**The .env file MUST be in the project root, not in the `model-ranking-test-script/` folder.**

Bun automatically loads `.env` files from the project root directory only. If you have a `.env` file in `model-ranking-test-script/`, it will NOT be loaded.

## Setup Instructions

### Option 1: Move .env to Project Root (Recommended)

```bash
# If you have .env in model-ranking-test-script/, move it to the root
mv model-ranking-test-script/.env .env
```

### Option 2: Set Environment Variables Directly

```bash
export ARTIFICIAL_ANALYSIS_API_KEY="your-aa-key-here"
export OPENROUTER_API_KEY="your-or-key-here"
```

### Option 3: Pass Inline

```bash
ARTIFICIAL_ANALYSIS_API_KEY=xxx OPENROUTER_API_KEY=yyy \
  bun run src/cli/score-models.ts --role=oracle
```

## Verify Environment Variables

Check if your environment variables are set:

```bash
# Check if Bun can see them
bun -e "console.log('AA:', Bun.env.ARTIFICIAL_ANALYSIS_API_KEY); console.log('OR:', Bun.env.OPENROUTER_API_KEY);"
```

## Expected Output

When API keys are properly configured, you should see:

```
Fetching external signals...
External signals fetched: 150+ entries
Sample signal keys: anthropic/claude-opus, openai/gpt-4-turbo, ...
```

When API keys are missing, you'll see:

```
Fetching external signals...
Warning: No API keys found. External signals will not be available.
Set ARTIFICIAL_ANALYSIS_API_KEY and/or OPENROUTER_API_KEY environment variables.
External signals fetched: 0 entries
```

## Testing with API Keys

Once you've set up the environment variables correctly:

```bash
# Test with oracle role
bun run src/cli/score-models.ts --role=oracle

# You should see non-zero External Boost values in the output
```

## Troubleshooting

### "External signals fetched: 0 entries"

This means:
1. No API keys are set, OR
2. The API keys are invalid, OR
3. The external API services are unreachable

Check:
- `.env` file is in the project root (not in subdirectories)
- API keys are valid and not expired
- No network issues blocking API access

### "Warning: Artificial Analysis unavailable" or "Warning: OpenRouter unavailable"

This means the API call failed. Possible causes:
- Invalid API key
- Network timeout
- API service is down
- Rate limiting

The script will continue with whatever signals it could fetch successfully.
