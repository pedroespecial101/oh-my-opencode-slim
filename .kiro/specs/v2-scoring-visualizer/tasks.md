# V2 Scoring Visualizer - Implementation Tasks

## Phase 1: Data Generator (dump-v2-scores.ts)

### Task 1: Create Base Script Structure
- [x] 1.1 Create file `src/cli/scoring-v2/dump-v2-scores.ts`
- [x] 1.2 Add imports for required modules
- [x] 1.3 Create main async function with error handling
- [x] 1.4 Add TypeScript types for output structure

### Task 2: Implement API Key Validation
- [x] 2.1 Read ARTIFICIAL_ANALYSIS_API_KEY from process.env
- [x] 2.2 Read OPENROUTER_API_KEY from process.env
- [x] 2.3 Throw descriptive error if either key is missing
- [x] 2.4 Add console log for successful key detection

### Task 3: Implement Model Discovery
- [x] 3.1 Call discoverModelCatalog() from opencode-models
- [x] 3.2 Handle error response from discovery
- [x] 3.3 Filter models to exclude deprecated status only (keep active, beta, alpha)
- [x] 3.4 Log count of discovered models with status breakdown
- [x] 3.5 Add validation check against `opencode models --refresh` output

### Task 4: Implement External Signal Fetching
- [x] 4.1 Call fetchExternalModelSignals() with API keys (OpenRouter for signals only)
- [x] 4.2 Log warnings from signal fetch (non-fatal)
- [x] 4.3 Create helper function to find signal for specific model
- [x] 4.4 Use buildModelKeyAliases for model lookup
- [x] 4.5 Log warning for each model with missing external signal

### Task 5: Implement Weight Capture
- [x] 5.1 Define agentTypes array with all 6 agents
- [x] 5.2 Loop through agents and call getFeatureWeights()
- [x] 5.3 Store weights in output structure
- [x] 5.4 Validate all 11 features present in each weight set

### Task 6: Implement Model Scoring
- [x] 6.1 Loop through each active model
- [x] 6.2 For each model, loop through all 6 agents
- [x] 6.3 Call scoreCandidateV2() for each model × agent
- [x] 6.4 Extract features, weighted, and totalScore from result
- [x] 6.5 Find external signal for model
- [x] 6.6 Build model output object with all required fields

### Task 7: Implement JSON Output
- [x] 7.1 Build complete output structure with metadata
- [x] 7.2 Add generatedAt timestamp (ISO format)
- [x] 7.3 Add hasExternalSignals flags
- [x] 7.4 Write JSON to scoring-v2-dump.json in project root
- [x] 7.5 Use pretty-print formatting (2-space indent)
- [x] 7.6 Log success message with file path

### Task 8: Validate Data Generator Output
- [x] 8.1 Verify JSON file created in project root
- [x] 8.2 Validate JSON structure matches schema from design doc
- [x] 8.3 Verify model list matches `opencode models --refresh` output
- [x] 8.4 Verify deprecated models excluded, active/beta/alpha included
- [x] 8.5 Verify status breakdown shows correct penalties (alpha=-5.5, beta=+8.8, active=+22)
- [x] 8.6 Verify external signals populated for models with data
- [x] 8.7 Verify warnings logged for models without external signals

## Phase 2: HTML Visualizer (scoring-visualiser.html)

### Task 9: Create HTML Structure
- [x] 9.1 Create scoring-visualiser.html in project root
- [x] 9.2 Add DOCTYPE and basic HTML structure
- [x] 9.3 Add meta tags (charset, viewport)
- [x] 9.4 Create global header section
- [x] 9.5 Create tab navigation section
- [x] 9.6 Create main content area with 5 tab divs

### Task 10: Implement CSS Styling
- [x] 10.1 Define CSS variables for colors and spacing
- [x] 10.2 Style global header (sticky positioning)
- [x] 10.3 Style tab navigation buttons
- [x] 10.4 Style table elements (borders, padding, headers)
- [x] 10.5 Style sticky table headers
- [x] 10.6 Add missing-signal amber background class
- [x] 10.7 Add expandable row styles
- [x] 10.8 Add responsive layout rules

### Task 11: Implement Data Loading
- [x] 11.1 Add fetch() call for scoring-v2-dump.json
- [x] 11.2 Parse JSON response
- [x] 11.3 Store data in global state object
- [x] 11.4 Add error handling for fetch failure
- [x] 11.5 Display error message if JSON invalid
- [x] 11.6 Validate required fields present

### Task 12: Implement Global State Management
- [x] 12.1 Create state object with default values
- [x] 12.2 Implement setState() function
- [x] 12.3 Add render() function to update all tabs
- [x] 12.4 Implement tab switching logic
- [x] 12.5 Implement agent filter logic
- [x] 12.6 Implement signal filter logic

### Task 13: Implement Global Header
- [x] 13.1 Add page title and generated timestamp
- [x] 13.2 Create agent filter button group
- [x] 13.3 Add click handlers for agent buttons
- [x] 13.4 Create signal filter checkbox
- [x] 13.5 Add change handler for checkbox
- [x] 13.6 Style active filter button

### Task 14: Implement Tab 1 - Weights Matrix
- [x] 14.1 Create feature descriptions object
- [x] 14.2 Build table with features as rows
- [x] 14.3 Add BASE column with base weights
- [x] 14.4 Add column for each agent type
- [x] 14.5 Implement heatmap color calculation
- [x] 14.6 Highlight cells where weight differs from base
- [x] 14.7 Bold active agent column
- [x] 14.8 Add feature description column

### Task 15: Implement Tab 2 - Raw Data
- [x] 15.1 Create table with 13 columns
- [x] 15.2 Render one row per model
- [x] 15.3 Format context/output as K tokens
- [x] 15.4 Display booleans as ✓/✗
- [x] 15.5 Apply amber background to missing signals
- [x] 15.6 Implement column highlighting for active agent
- [x] 15.7 Calculate relevant columns based on weights
- [x] 15.8 Apply signal filter

### Task 16: Implement Tab 3 - Normalized Features
- [x] 16.1 Create table with 11 feature columns
- [x] 16.2 Default to Orchestrator when "All" selected
- [x] 16.3 Render features from byAgent[selectedAgent]
- [x] 16.4 Implement per-column heatmap scaling
- [x] 16.5 Add tooltips with normalization formulas
- [x] 16.6 Apply blue gradient for positive values
- [x] 16.7 Apply red gradient for negative values
- [x] 16.8 Apply signal filter

### Task 17: Implement Tab 4 - V2 Scores & Rankings
- [x] 17.1 Create table with rank and weighted feature columns
- [x] 17.2 Sort models by totalScore descending
- [x] 17.3 Implement mini bar chart SVG for total score
- [x] 17.4 Scale bar chart to max score in view
- [x] 17.5 Add click handler for row expansion
- [x] 17.6 Implement expanded row comparison chart
- [x] 17.7 Compare against #1 ranked model
- [x] 17.8 Show prompt if "All" agent filter active
- [x] 17.9 Apply signal filter

### Task 18: Implement Tab 5 - Hardcodes & Gotchas
- [x] 18.1 Create Section A table for hardcoded adjustments
- [x] 18.2 Document Qwen3 penalty pattern
- [x] 18.3 Document Kimi K2.5 bonus pattern
- [x] 18.4 Document Minimax M2.1 bonus pattern
- [x] 18.5 Document Explorer latency multiplier
- [x] 18.6 Document Designer output penalty
- [x] 18.7 Create Section B list of naming risks
- [x] 18.8 Create Section C scope notes
- [x] 18.9 Add plain-English risk descriptions

### Task 19: Implement Helper Functions
- [x] 19.1 Create getHeatmapColor() function
- [x] 19.2 Create createBarChart() SVG function
- [x] 19.3 Create createComparisonChart() function
- [x] 19.4 Create getRelevantColumns() function
- [x] 19.5 Create getNormalizedHeatmap() function
- [x] 19.6 Create filterModels() function

### Task 20: Validate HTML Visualizer
- [x] 20.1 Verify all 5 tabs render without errors
- [x] 20.2 Verify agent filter updates all tabs
- [x] 20.3 Verify signal filter updates all tabs
- [x] 20.4 Verify row expansion works in Tab 4
- [x] 20.5 Verify heatmaps display with correct colors
- [x] 20.6 Verify bar charts render as inline SVG
- [x] 20.7 Verify tooltips display on hover
- [x] 20.8 Verify missing signals show amber background

## Phase 3: Documentation & Integration

### Task 21: Update .gitignore
- [x] 21.1 Add scoring-v2-dump.json to .gitignore
- [x] 21.2 Verify scoring-visualiser.html is tracked

### Task 22: Create Usage Documentation
- [x] 22.1 Create README in model-ranking-test-script/
- [x] 22.2 Document how to run data generator
- [x] 22.3 Document how to start local server
- [x] 22.4 Document how to open visualizer
- [x] 22.5 Add troubleshooting section
- [x] 22.6 Add example screenshots (optional)

### Task 23: Code Quality Validation
- [x] 23.1 Verify TypeScript file has no syntax errors
- [x] 23.2 Verify HTML file has valid structure
- [x] 23.3 Add code comments for complex logic in dump-v2-scores.ts
- [x] 23.4 Add code comments for complex logic in HTML JavaScript
- [x] 23.5 Ensure code follows project style guide (80 char line width, 2-space indent)

### Task 24: Final Validation
- [x] 24.1 Verify complete workflow: generate JSON → start server → view HTML
- [x] 24.2 Verify model list matches `opencode models --refresh` output
- [x] 24.3 Verify alpha models visible with correct -5.5 point penalty
- [x] 24.4 Verify error message clear when API keys missing
- [x] 24.5 Verify all hardcodes from features.ts documented in Tab 5
- [x] 24.6 Verify JSON file size reasonable (< 1MB for ~100 models)
- [x] 24.7 Test that good alpha model can outscore mediocre active model

## Acceptance Criteria Summary

### Data Generator
- ✓ Runs with `bun run src/cli/scoring-v2/dump-v2-scores.ts`
- ✓ Outputs valid JSON to project root
- ✓ Filters to active models only
- ✓ Requires API keys from .env
- ✓ Includes all 6 agents and 11 features
- ✓ Handles missing signals gracefully

### HTML Visualizer
- ✓ Self-contained (no external dependencies)
- ✓ Works via local server
- ✓ 5 tabs render correctly
- ✓ Global filters work across all tabs
- ✓ Heatmaps use correct color gradients
- ✓ Bar charts scale proportionally
- ✓ All hardcodes documented in Tab 5
- ✓ Works in Chrome, Firefox, Safari

### Code Quality
- ✓ Passes `bun run check:ci`
- ✓ Passes `bun run typecheck`
- ✓ Follows project style guide
- ✓ No side effects on existing code
- ✓ Clear error messages
- ✓ Adequate code comments
