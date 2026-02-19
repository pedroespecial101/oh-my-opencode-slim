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
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    format: 'md',
    help: false,
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      result.help = true;
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
  --output=<file>         Write to file (default: stdout)
  --format=<format>       Output format: md or csv (default: md)
  --help                  Show this help message

Note: Only models with status='active' are included in scoring.

Examples:
  # Score all roles for active models
  bun run src/cli/score-models.ts

  # Score specific role
  bun run src/cli/score-models.ts --role=oracle

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

  // Filter to active models only
  models = models.filter((m) => m.status === 'active' || !m.status);
  console.error(`Filtered to ${models.length} active models`);

  if (models.length === 0) {
    console.error('No active models found');
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

  // Check if external signals are actually available
  const signalKeys = Object.keys(signals);
  console.error(`External signals fetched: ${signalKeys.length} entries`);

  // Count signals by source to detect if APIs are working
  let aaCount = 0;
  let orCount = 0;
  for (const signal of Object.values(signals)) {
    if (signal.qualityScore !== undefined || signal.codingScore !== undefined) {
      aaCount++;
    }
    if (
      signal.inputPricePer1M !== undefined ||
      signal.outputPricePer1M !== undefined
    ) {
      orCount++;
    }
  }

  console.error(`AA entries loaded: ${aaCount}`);
  console.error(`OR entries loaded: ${orCount}`);

  if (aaCount === 0 && orCount === 0 && signalKeys.length === 0) {
    console.error(
      'Warning: No external signals loaded. External boosts will be 0 for all models.',
    );
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
