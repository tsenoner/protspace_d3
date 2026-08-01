## ADDED Requirements

### Requirement: Protein search distinguishes an already-selected exact match

The protein search SHALL show constructive already-selected feedback when the trimmed query exactly matches an available, selected protein ID case-insensitively and no selectable suggestion remains.

#### Scenario: Exact selected protein is searched

- **WHEN** a user searches for the exact ID of a protein that is already selected
- **THEN** the search feedback displays `Protein ID is already selected`
- **AND** it does not display `No matching protein IDs found`

#### Scenario: Exact selected protein uses different letter case

- **WHEN** a user searches for an available selected protein ID using different letter case
- **THEN** the search feedback displays `Protein ID is already selected`

### Requirement: Generic no-match feedback remains available

The protein search SHALL continue to show generic no-match feedback for a non-empty query that has no selectable suggestions and is not an exact match for an available selected protein.

#### Scenario: Query does not identify a selected protein

- **WHEN** a non-empty query has no selectable suggestions and does not exactly identify an available selected protein
- **THEN** the search feedback displays `No matching protein IDs found`
