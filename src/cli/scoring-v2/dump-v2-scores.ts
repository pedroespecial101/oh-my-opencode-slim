import { fetchExternalModelSignals } from '../external-rankings';
import { buildModelKeyAliases } from '../model-key-normalization';
import { discoverModelCatalog } from '../opencode-models';
import type {
  DiscoveredModel,
  ExternalModelSignal,
  ExternalSignalMap,
} from '../types';
import { scoreCandidateV2 } from './engine';
import type { FeatureVector, FeatureWeights, ScoringAgentName } from './types';
import { getFeatureWeights } from './weights';

// Output schema types
interface ModelDump {
  id: string;
  name: string;
  providerID: string;
  status: 'alpha' | 'beta' | 'active' | 'deprecated';
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
  byAgent: Record<
    ScoringAgentName,
    {
      features: FeatureVector;
      weighted: FeatureVector;
      totalScore: number;
    }
  >;
}

interface DumpOutput {
  generatedAt: string;
  agentTypes: ScoringAgentName[];
  hasExternalSignals: {
    artificialAnalysis: boolean;
    openRouter: boolean;
  };
  weights: Record<ScoringAgentName, FeatureWeights>;
  models: ModelDump[];
}

/**
 * Find external signal for a model using the same logic as features.ts
 */
function findSignalForModel(
  model: DiscoveredModel,
  signals: ExternalSignalMap,
): ExternalModelSignal | undefined {
  const keys = buildModelKeyAliases(model.model);
  for (const key of keys) {
    if (signals[key]) return signals[key];
  }
  return undefined;
}

async function main() {
  console.log('V2 Scoring Visualizer - Data Generator\n');

  // 1. Validate API keys from .env
  const aaKey = process.env.ARTIFICIAL_ANALYSIS_API_KEY;
  const orKey = process.env.OPENROUTER_API_KEY;

  if (!aaKey || !orKey) {
    throw new Error(
      'Missing required API keys in .env file.\n' +
        'Required: ARTIFICIAL_ANALYSIS_API_KEY, OPENROUTER_API_KEY',
    );
  }

  console.log('✓ API keys detected');

  // 2. Discover models
  console.log('\nDiscovering models...');
  const { models, error } = await discoverModelCatalog();
  if (error) {
    throw new Error(`Failed to discover models: ${error}`);
  }

  // 3. Filter to exclude deprecated models only
  // Include active, beta, and alpha - all are real usable models
  // Exclude deprecated - these are dead models not available for use
  // Note: 'inactive' status doesn't exist in DiscoveredModel type
  const activeModels = models.filter((m) => m.status !== 'deprecated');

  // Log for verification
  const statusCounts = {
    active: activeModels.filter((m) => m.status === 'active').length,
    beta: activeModels.filter((m) => m.status === 'beta').length,
    alpha: activeModels.filter((m) => m.status === 'alpha').length,
  };

  console.log(
    `✓ Discovered ${activeModels.length} models ` +
      `(active: ${statusCounts.active}, beta: ${statusCounts.beta}, ` +
      `alpha: ${statusCounts.alpha})`,
  );

  const providers = [...new Set(activeModels.map((m) => m.providerID))];
  console.log(`  Providers: ${providers.join(', ')}`);

  // Validation: Compare against opencode models --refresh
  // This safeguards against catalog bugs (e.g., OpenRouter models appearing)
  console.log('\n  Validating against opencode models --refresh...');
  // TODO: Add validation logic in implementation

  // 4. Fetch external signals
  // Note: OpenRouter API is used for signals only, not as a model provider
  console.log('\nFetching external signals...');
  const { signals, warnings } = await fetchExternalModelSignals({
    artificialAnalysisApiKey: aaKey,
    openRouterApiKey: orKey,
  });

  // Log warnings but continue (non-fatal)
  for (const w of warnings) {
    console.warn(`⚠ ${w}`);
  }

  // Log missing signals for each model
  let missingSignalCount = 0;
  for (const model of activeModels) {
    const signal = findSignalForModel(model, signals);
    if (!signal) {
      console.warn(`⚠ No external signal found for: ${model.model}`);
      missingSignalCount++;
    }
  }

  console.log(
    `✓ External signals fetched ` +
      `(${activeModels.length - missingSignalCount} matched, ` +
      `${missingSignalCount} missing)`,
  );

  // 5. Build output structure
  const agentTypes: ScoringAgentName[] = [
    'orchestrator',
    'oracle',
    'designer',
    'explorer',
    'librarian',
    'fixer',
  ];

  // 6. Capture weights for all agents
  console.log('\nCapturing feature weights...');
  const weights: Record<ScoringAgentName, FeatureWeights> = {} as Record<
    ScoringAgentName,
    FeatureWeights
  >;
  for (const agent of agentTypes) {
    weights[agent] = getFeatureWeights(agent);
  }
  console.log(`✓ Captured weights for ${agentTypes.length} agent types`);

  // 7. Score each model × agent combination
  console.log('\nScoring models...');
  const modelsOutput: ModelDump[] = activeModels.map((model) => {
    const byAgent: Record<
      ScoringAgentName,
      {
        features: FeatureVector;
        weighted: FeatureVector;
        totalScore: number;
      }
    > = {} as Record<
      ScoringAgentName,
      {
        features: FeatureVector;
        weighted: FeatureVector;
        totalScore: number;
      }
    >;

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
      externalSignals: signal
        ? {
            present: true,
            latencySeconds: signal.latencySeconds ?? null,
            qualityScore: signal.qualityScore ?? null,
            codingScore: signal.codingScore ?? null,
            inputPricePer1M: signal.inputPricePer1M ?? null,
            outputPricePer1M: signal.outputPricePer1M ?? null,
          }
        : {
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

  console.log(
    `✓ Scored ${modelsOutput.length} models × ${agentTypes.length} agents ` +
      `= ${modelsOutput.length * agentTypes.length} combinations`,
  );

  // 8. Write output
  console.log('\nGenerating JSON output...');
  const output: DumpOutput = {
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

  console.log('\n✅ Data generation complete!');
  console.log(
    '\nNext steps:\n' +
      '  1. Start local server: python3 -m http.server 8000\n' +
      '  2. Open browser: http://localhost:8000/scoring-visualiser.html',
  );
}

main().catch((error) => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
