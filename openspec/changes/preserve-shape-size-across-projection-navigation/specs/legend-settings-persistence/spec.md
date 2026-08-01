## ADDED Requirements

### Requirement: Automatic projection navigation preserves dataset display settings

The explore view SHALL restore dataset-scoped legend display settings when projection navigation or
a browser reload causes a fresh controller to load the same default dataset automatically.

#### Scenario: Direct projection URL restores Shape size

- **WHEN** a user saves a non-default Shape size and opens a projection URL for the same default
  dataset in a fresh explore controller
- **THEN** the Shape size and its effective rendered point size match the saved setting

#### Scenario: Reload after projection change restores Shape size

- **WHEN** a user saves a non-default Shape size, changes projection, and reloads the explore page
- **THEN** the Shape size and its effective rendered point size match the saved setting

### Requirement: Explicit demo reset clears dataset display settings

The explore view SHALL clear persisted dataset display settings when the user explicitly resets to
the demo dataset after a dataset is already active.

#### Scenario: Reset to demo restores defaults

- **WHEN** a dataset is active and the user explicitly resets to the demo dataset
- **THEN** persisted custom legend display settings are cleared
- **AND** the demo dataset uses its default legend display settings

### Requirement: Imported settings retain precedence

The explore view SHALL continue to replace local persisted display settings with settings embedded
in a user-imported dataset bundle.

#### Scenario: Import bundle with settings

- **WHEN** a user imports a dataset bundle containing legend settings
- **THEN** the embedded legend settings are applied instead of stale local settings for that dataset
