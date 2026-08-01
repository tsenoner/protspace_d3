## ADDED Requirements

### Requirement: Preparation notebook Generate actions use current projection inputs

The Preparation notebook SHALL recompute dimensionality-reduction projections on every Generate action and SHALL NOT read cached projection coordinates from an earlier action. This projection refresh SHALL NOT disable caching for other intermediate stages.

#### Scenario: Reducer parameters change between Generate actions

- **WHEN** a user changes a dimensionality-reduction parameter and activates Generate again
- **THEN** the selected reducer runs with the current parameter value
- **AND** the downloaded bundle contains coordinates produced by that run

#### Scenario: Input data changes without changing its logical embedding name

- **WHEN** a user changes the input embeddings while the embedding name, method, and reducer parameters match an earlier Generate action
- **THEN** the reducer runs against the current embedding matrix
- **AND** cached coordinates from the earlier input are not used

#### Scenario: Non-projection intermediates remain reusable

- **WHEN** the notebook requests fresh projections
- **THEN** only the projection stage is explicitly refreshed
- **AND** retained query, embedding, and annotation intermediates remain eligible for their existing cache behavior
