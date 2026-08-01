## ADDED Requirements

### Requirement: Produced annotation categories do not collide with missing-value sentinels

The Python annotation producer SHALL serialize a completed categorical prediction using
a value that the TypeScript bundle consumer preserves as a category rather than
normalizing to missing data.

#### Scenario: Negative TMbed prediction crosses the bundle boundary

- **WHEN** Biocentral returns a completed TMbed prediction containing neither an
  alpha-helical nor a beta-barrel transmembrane segment
- **THEN** the producer emits `non-transmembrane`
- **AND** the TypeScript visualization data exposes `non-transmembrane` as a categorical
  value rather than `N/A`

#### Scenario: Missing TMbed prediction remains missing

- **WHEN** Biocentral returns no TMbed prediction for a protein
- **THEN** the producer emits the established missing representation
- **AND** the TypeScript visualization data does not invent a transmembrane category
