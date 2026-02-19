# V2 Scoring Visualizer - Requirements

## Overview

A standalone diagnostic tool to visualize the V2 model scoring system. This tool helps developers understand and audit how models are scored for different agent roles (orchestrator, oracle, designer, explorer, librarian, fixer) before building a user-facing model assignment UI.

## Context

- The V2 scoring system (`src/cli/scoring-v2/`) evaluates AI models objectively based on features and weights
- This is separate from the policy engine (`buildDynamicModelPlan`) which applies business constraints
- The visualizer focuses purely on scoring mechanics, not installation policy
- Must not reference or import from `src/cli/score-models.ts` (contains bugs)
- Must not use `buildDynamicModelPlan()` or `src/cli/dynamic-model-selection.ts`

## User Stories

### US-1: Generate Scoring Data
As a developer, I want to run a CLI script that generates a JSON dump of all V2 scoring data, so I can analyze model scores offline.

**Acceptance Criteria:**
- AC-1.1: Script runs with `bun run src/cli/scoring-v2/dump-v2-scores.ts`
- AC-1.2: Script outputs `scoring-v2-dump.json` to project root
- AC-1.3: Script discovers models using `discoverModelCatalog()` from `../opencode-models`
- AC-1.4: Script filters to exclude only deprecated models (status !== 'deprecated')
- AC-1.5: Script reads API keys from `.env` file (ARTIFICIAL_ANALYSIS_API_KEY, OPENROUTER_API_KEY)
- AC-1.6: Script throws clear error if required API keys are missing
- AC-1.7: Script fetches external signals using `fetchExternalModelSignals()`
- AC-1.8: Script captures feature weights for all 6 agent types
- AC-1.9: Script scores each model × agent combination using `scoreCandidateV2()`
- AC-1.10: JSON output matches the exact schema specified in design document
- AC-1.11: Model list matches output from `opencode models --refresh` command
- AC-1.12: Validates model list matches `opencode models --refresh` output (safeguard against catalog bugs)

### US-2: Visualize Weight Matrix
As a developer, I want to see a weight matrix showing how each agent type weights different features, so I can understand agent-specific scoring priorities.

**Acceptance Criteria:**
- AC-2.1: Tab displays features as rows, agent types as columns
- AC-2.2: Includes BASE column showing base weights
- AC-2.3: Highlights cells where agent weight differs from base
- AC-2.4: Applies heatmap coloring (darker = higher absolute weight)
- AC-2.5: Uses different hue for negative weights (red gradient)
- AC-2.6: Uses blue gradient for positive weights
- AC-2.7: Bolds the active agent column when agent filter is active
- AC-2.8: Includes plain-English description for each feature

### US-3: View Raw Model Data
As a developer, I want to see raw model data in a table, so I can understand the input data before normalization.

**Acceptance Criteria:**
- AC-3.1: Displays one row per model
- AC-3.2: Shows columns: Model ID, Provider, Status, Context (K tokens), Output (K tokens), Reasoning, Toolcall, Attachment, Latency (s), Quality Score, Coding Score, Input $/1M, Output $/1M
- AC-3.3: Booleans displayed as ✓/✗
- AC-3.4: Missing external signal cells show `—` with amber background
- AC-3.5: When agent filter active, highlights columns most relevant to that agent
- AC-3.6: Column relevance based on highest-weight features from Tab 1

### US-4: View Normalized Features
As a developer, I want to see normalized feature values, so I can understand how raw data is transformed before scoring.

**Acceptance Criteria:**
- AC-4.1: Same rows as Tab 2 (one per model)
- AC-4.2: Columns show `features` values from `byAgent[selectedAgent]`
- AC-4.3: When "All" selected, defaults to Orchestrator
- AC-4.4: Applies per-column heatmap scaling (0→max within each column)
- AC-4.5: Column headers have tooltips explaining normalization formula
- AC-4.6: Uses blue gradient for positive values
- AC-4.7: Uses red gradient for negative values

### US-5: View V2 Scores & Rankings
As a developer, I want to see final scores and rankings, so I can understand which models score best for each agent role.

**Acceptance Criteria:**
- AC-5.1: Displays one row per model
- AC-5.2: Shows columns: Rank, Model, Provider, one column per weighted feature, Total Score
- AC-5.3: Sorted by totalScore descending for active agent
- AC-5.4: Total Score cell includes mini horizontal bar chart (inline SVG)
- AC-5.5: Bar chart proportional to max score in view
- AC-5.6: Clicking row expands to show per-feature bar chart
- AC-5.7: Expanded view compares model's weighted contributions vs #1 ranked model
- AC-5.8: Requires agent selection - prompts user if "All" is active

### US-6: Understand Hardcoded Logic
As a developer, I want to see all hardcoded adjustments and risks, so I can understand scoring system limitations.

**Acceptance Criteria:**
- AC-6.1: Section A lists every hardcoded adjustment in `features.ts`
- AC-6.2: For each hardcode: regex pattern, target provider, affected agents, numeric effect, risk description
- AC-6.3: Section B lists model naming gotchas (pattern variations that break matching)
- AC-6.4: Section C explains V2 scoring scope (excludes post-scoring policy logic)
- AC-6.5: Content is static (no data binding needed)

### US-7: Filter by Agent Type
As a developer, I want to filter views by agent type, so I can focus on specific agent scoring behavior.

**Acceptance Criteria:**
- AC-7.1: Global header has button group: All | Orchestrator | Oracle | Designer | Explorer | Librarian | Fixer
- AC-7.2: Filter affects all tabs simultaneously
- AC-7.3: Filter state persists when switching tabs
- AC-7.4: Default state is "All"

### US-8: Filter by Signal Availability
As a developer, I want to hide models without external signals, so I can focus on models with complete data.

**Acceptance Criteria:**
- AC-8.1: Global header has checkbox: "Hide models with missing external signals"
- AC-8.2: Filter affects all tabs simultaneously
- AC-8.3: Filter state persists when switching tabs
- AC-8.4: Default state is unchecked (show all models)

## Technical Constraints

### TC-1: Self-Contained HTML
- Single HTML file with all CSS and JS inline
- No external dependencies or CDN calls
- Must work via local server (e.g., `python3 -m http.server`)
- Loads `scoring-v2-dump.json` via `fetch('./scoring-v2-dump.json')`

### TC-2: Data Integrity
- JSON schema must match `ScoredCandidate` type structure
- Feature names must match `ScoreFeatureName` type
- Agent names must match `ScoringAgentName` type
- Must validate against actual V2 scoring system output

### TC-3: No Side Effects
- Tool is completely standalone
- Does not modify any existing code
- Does not affect project functionality
- Output files in project root (not committed to git)

### TC-4: Error Handling
- Clear error if API keys missing from `.env`
- Graceful handling of missing external signals
- Clear error if `opencode models` command fails
- Validation of JSON structure before HTML rendering

## Non-Functional Requirements

### NFR-1: Performance
- JSON generation completes within 30 seconds
- HTML loads and renders within 2 seconds
- Tab switching is instant (< 100ms)
- Filtering updates within 200ms

### NFR-2: Usability
- Clean, readable layout (developer tool, not product UI)
- Clear visual hierarchy
- Intuitive navigation
- Helpful tooltips and descriptions

### NFR-3: Maintainability
- Code follows project style guide (Biome)
- Clear comments for complex logic
- Modular structure for HTML/JS
- Easy to update when V2 scoring changes

## Out of Scope

- Integration with existing scoring or selection code
- User-facing model assignment UI
- Post-scoring policy logic visualization
- Real-time data updates
- Model comparison across multiple runs
- Export functionality (CSV, PDF, etc.)
- Authentication or access control
- Mobile responsive design
