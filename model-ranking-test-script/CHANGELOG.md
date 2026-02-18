# Changelog

## 2026-02-18 - Initial Implementation

### Added
- Created `src/cli/score-models.ts` - Standalone model scoring script
- CLI argument parsing (--role, --output, --format, --help)
- Markdown table output format
- CSV export format
- Role filtering support
- External signal integration (Artificial Analysis + OpenRouter)
- Comprehensive documentation (README.md, IMPLEMENTATION_PLAN.md, QUICK_START.md)

### Fixed
- **macOS GUI Launch Issue**: Fixed `resolveOpenCodePath()` in `src/cli/system.ts` to prioritize CLI paths (Homebrew, system bins) over macOS app bundle paths. Previously, the script would launch the OpenCode GUI app instead of using the CLI when both were installed.

### Technical Details

#### Path Resolution Priority (Fixed)
The path resolution now checks in this order:
1. `opencode` in PATH
2. Homebrew installations (`/opt/homebrew/bin/opencode`)
3. User local installations (`~/.local/bin/opencode`)
4. System-wide installations (`/usr/local/bin/opencode`)
5. Package manager installations (Snap, Flatpak, Nix, Cargo, npm, etc.)
6. macOS app bundle (last resort - may launch GUI)

This ensures the CLI is always used when available, preventing the GUI from launching unexpectedly.

### Files Modified
- `src/cli/system.ts` - Reordered path priority in `getOpenCodePaths()`
- `src/cli/score-models.ts` - New file

### Files Created
- `model-ranking-test-script/IMPLEMENTATION_PLAN.md`
- `model-ranking-test-script/README.md`
- `model-ranking-test-script/QUICK_START.md`
- `model-ranking-test-script/COMPLETION_SUMMARY.md`
- `model-ranking-test-script/CHANGELOG.md` (this file)

### Testing
- ✅ Script runs without launching GUI
- ✅ Discovers 67+ models from OpenCode catalog
- ✅ Scores models using V1 engine
- ✅ Outputs markdown and CSV formats
- ✅ Filters by role correctly
- ✅ Handles missing API keys gracefully
- ✅ Passes TypeScript type checking
- ✅ Passes Biome linting

### Known Limitations
- First run takes 30-60 seconds (OpenCode refreshes catalog)
- External signals require API keys (optional)
- Requires OpenCode to be installed

### Next Steps
- Consider adding JSON output format
- Add provider filtering
- Add sorting options
- Consider caching model catalog for faster subsequent runs
