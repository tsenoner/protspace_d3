## Why

Changing projection through a direct explore URL or reloading after an in-app projection change
remounts the default dataset and replaces its persisted legend settings with the bundle defaults.
The Shape size control then returns to `30` even though projection is view state and point size is a
dataset-scale preference.

## What Changes

- Retain legend settings when the default dataset is loaded automatically into a fresh explore
  controller, including projection deep links and browser reloads.
- Preserve the existing explicit reset-to-demo behavior when a dataset is already active.
- Add focused regression coverage for automatic default-load retention and explicit default reset.

## Capabilities

### New Capabilities

- `legend-settings-persistence`: Defines how dataset-scoped legend display settings survive explore
  navigation while explicit dataset reset actions clear them.

### Modified Capabilities

None.

## Impact

- `apps/web/src/explore/dataset-controller.ts` default-load persistence decision.
- `packages/core/src/controllers/base-persistence-controller.ts` file-setting merge semantics.
- Dataset-controller unit tests and a focused browser regression for Shape size restoration.
- No API, dependency, or bundle-format changes.
