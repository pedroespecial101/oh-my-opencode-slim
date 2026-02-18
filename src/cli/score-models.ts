import { getEnv } from '../utils';
import {
  rankModelsV1WithBreakdown,
  type V1RankedScore,
} from './dynamic-model-selection';
import { fetchExternalModelSignals } from './external-rankings';
import { discoverModelCatalog } from './opencode-models';
import type { DiscoveredModel } from './types';

const AGENT_ROLES = [
  'oracle',
  'orchestrator',
  'designer',
  'explorer',
  'librarian',
  'fixer',
] as const;

type AgentRole = (typeof AGENT_ROLES)[number];

interface ScoreResult {
  role: AgentRole;
  scores: V1RankedScore[];
}

interface CliArgs {
  role?: AgentRole;
  output?: string;
  format: 'md' | 'csv';
  help: boolean;
  providers?: string[];
  all: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    format: 'md',
    help: false,
    all: false,
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--all') {
      result.all = true;
    } else if (arg.startsWith('--role=')) {
      const role = arg.slice(7) as AgentRole;
      if (!AGENT_ROLES.includes(role)) {
        console.error(`Invalid role: ${role}`);
        console.error(`Valid roles: ${AGENT_ROLES.join(', ')}`);
        process.exit(2);
      }
      result.role = role;
    } else if (arg.startsWith('--output=')) {
      result.output = arg.slice(9);
    } else if (arg.startsWith('--format=')) {
      const format = arg.slice(9) as 'md' | 'csv';
      if (format !== 'md' && format !== 'csv') {
        console.error(`Invalid format: ${format}`);
        console.error('Valid formats: md, csv');
        process.exit(2);
      }
      result.format = format;
    } else if (arg.startsWith('--providers=')) {
      result.providers = arg.slice(12).split(',').map((p) => p.trim());
    }
  }

  return result;
}

function showHelp(): void {
  console.log(`
Model Ranking Test Script

Usage: bun run src/cli/score-models.ts [options]

Options:
  --role=<role>           Score specific role only (default: all roles)
                          Valid roles: ${AGENT_ROLES.join(', ')}
  --all                   Show all models from catalog (default: active only)
  --providers=<list>      Filter by specific providers (comma-separated)
                          Example: --providers=opencode,github-copilot
  --output=<file>         Write to file (default: stdout)
  --format=<format>       Output format: md or csv (default: md)
  --help                  Show this help message

Provider Filtering:
  By default, only models from ACTIVE providers are shown (auto-detected).
  Use --all to see all models from the OpenCode catalog.
  Use --providers to specify exact providers to include.

Examples:
  # Score active providers only (default)
  bun run src/cli/score-models.ts --role=oracle

  # Score ALL models from catalog
  bun run src/cli/score-models.ts --role=oracle --all

  # Score specific providers
  bun run src/cli/score-models.ts --providers=opencode,github-copilot

  # Save to CSV file
  bun run src/cli/score-models.ts --format=csv --output=scores.csv

Environment Variables:
  ARTIFICIAL_ANALYSIS_API_KEY   API key for Artificial Analysis
  OPENROUTER_API_KEY            API key for OpenRouter
`);
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  console.error('Discovering model catalog...');
  const { models: discoveredModels, error: modelError } =
    await discoverModelCatalog();

  if (modelError) {
    console.error(`Error discovering models: ${modelError}`);
    process.exit(1);
  }

  let models = discoveredModels;

  if (models.length === 0) {
    console.error('No models found in catalog');
    process.exit(1);
  }

  console.error(`Found ${models.length} models`);

  // Determine which providers to use
  let providersToUse: string[] | undefined;

  if (args.all) {
    // --all flag: show all models
    console.error('Showing all models from catalog');
  } else if (args.providers && args.providers.length > 0) {
    // --providers flag: use specified providers
    providersToUse = args.providers;
  } else {
    // Default: use common active providers
    // Note: Auto-detection via 'opencode models' doesn't work reliably in spawned processes
    // Users can override with --providers or --all
    providersToUse = ['opencode', 'github-copilot', 'kiro', 'perplexity'];
    console.error(
      `Using default providers: ${providersToUse.join(', ')}`,
    );
    console.error(
      'Use --providers=x,y,z to specify different providers, or --all for everything',
    );
  }

  // Filter by providers if needed
  if (providersToUse && providersToUse.length > 0) {
    const providerSet = new Set(providersToUse);
    models = models.filter((m) => providerSet.has(m.providerID));
    console.error(
      `Filtered to ${models.length} models from providers: ${providersToUse.join(', ')}`,
    );
  }

  if (models.length === 0) {
    console.error('No models found after filtering');
    process.exit(1);
  }

  console.error('Fetching external signals...');
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
  
  const { signals, warnings } = await fetchExternalModelSignals({
    artificialAnalysisApiKey: aaKey,
    openRouterApiKey: orKey,
  });

  // Debug: Log signal information
  const signalKeys = Object.keys(signals);
  console.error(`External signals fetched: ${signalKeys.length} entries`);
  if (signalKeys.length > 0) {
    console.error(`Sample signal keys: ${signalKeys.slice(0, 5).join(', ')}`);
  }

  if (warnings.length > 0) {
    for (const warning of warnings) {
      console.error(`Warning: ${warning}`);
    }
  }

  const rolesToScore = args.role ? [args.role] : AGENT_ROLES;
  const results: ScoreResult[] = [];

  console.error('Scoring models...');
  for (const role of rolesToScore) {
    const scores = rankModelsV1WithBreakdown(models, role, signals);
    results.push({ role, scores });
    
    // Debug: Check if any models have non-zero external boosts
    const withBoost = scores.filter((s) => s.externalSignalBoost !== 0);
    console.error(
      `${role}: ${withBoost.length}/${scores.length} models have external boost`,
    );
  }

  const output =
    args.format === 'csv'
      ? formatCsv(results, models)
      : formatMarkdown(results, models);

  if (args.output) {
    await Bun.write(args.output, output);
    console.error(`Results written to ${args.output}`);
  } else {
    console.log(output);
  }
}

// Format results as markdown table
// External Boost comes from rankModelsV1WithBreakdown's externalSignalBoost field,
// which is calculated by getExternalSignalBoost() based on:
// - Artificial Analysis quality and coding scores
// - OpenRouter pricing information
// - Model latency data
// If external signals are unavailable or model keys don't match, boost will be 0.
function formatMarkdown(
  results: ScoreResult[],
  models: DiscoveredModel[],
): string {
  const lines: string[] = [];
  lines.push('# Model Ranking Results\n');

  for (const { role, scores } of results) {
    lines.push(
      `## ${role.charAt(0).toUpperCase() + role.slice(1)} Agent Rankings\n`,
    );
    lines.push(
      '| Rank | Model | Total Score | Base Score | External Boost | Provider | Status |',
    );
    lines.push(
      '|------|-------|-------------|------------|----------------|----------|--------|',
    );

    for (let i = 0; i < scores.length; i++) {
      const score = scores[i];
      const model = models.find((m) => m.model === score.model);
      const provider = model?.providerID || 'unknown';
      const status = model?.status || 'unknown';

      lines.push(
        `| ${i + 1} | ${score.model} | ${score.totalScore} | ${score.baseScore} | ${score.externalSignalBoost} | ${provider} | ${status} |`,
      );
    }

    lines.push('');
  }

  return lines.join('\n');
}

// Format results as CSV
// External Boost comes from rankModelsV1WithBreakdown's externalSignalBoost field,
// which is calculated by getExternalSignalBoost() based on:
// - Artificial Analysis quality and coding scores
// - OpenRouter pricing information
// - Model latency data
// If external signals are unavailable or model keys don't match, boost will be 0.
function formatCsv(results: ScoreResult[], models: DiscoveredModel[]): string {
  const lines: string[] = [];
  lines.push(
    'Rank,Role,Model,Total Score,Base Score,External Boost,Provider,Status',
  );

  for (const { role, scores } of results) {
    for (let i = 0; i < scores.length; i++) {
      const score = scores[i];
      const model = models.find((m) => m.model === score.model);
      const provider = model?.providerID || 'unknown';
      const status = model?.status || 'unknown';

      lines.push(
        `${i + 1},${role},${score.model},${score.totalScore},${score.baseScore},${score.externalSignalBoost},${provider},${status}`,
      );
    }
  }

  return lines.join('\n');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
