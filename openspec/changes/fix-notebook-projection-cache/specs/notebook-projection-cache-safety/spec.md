## ADDED Requirements

### Requirement: Preparation notebook Generate actions use current projection inputs

The Preparation notebook SHALL recompute dimensionality-reduction projections on every Generate action and SHALL NOT read cached projection coordinates from an earlier action. This projection refresh SHALL NOT disable compatible caching for other intermediate stages.

#### Scenario: Reducer parameters change between Generate actions

- **WHEN** a user changes a dimensionality-reduction parameter and activates Generate again
- **THEN** the selected reducer runs with the current parameter value
- **AND** the downloaded bundle contains coordinates produced by that run

#### Scenario: Input data changes without changing its logical embedding name

- **WHEN** a user changes the input embeddings while the embedding name, method, and reducer parameters match an earlier Generate action
- **THEN** the reducer runs against the current embedding matrix
- **AND** cached coordinates from the earlier input are not used

#### Scenario: Compatible non-projection intermediates remain reusable

- **WHEN** the notebook requests fresh projections
- **THEN** only the projection stage is explicitly refreshed
- **AND** retained query, embedding, and annotation intermediates remain eligible for reuse when their cache identity matches the current input

### Requirement: Preparation notebook caches are owned by their inputs

The Preparation notebook SHALL partition retained query FASTA files by query text and SHALL partition embedding, annotation, and projection intermediates by the content of the selected input file.

#### Scenario: UniProt query changes between Generate actions

- **WHEN** a user generates from one UniProt query and then selects a different query
- **THEN** the second action SHALL NOT reuse the first query's downloaded FASTA

#### Scenario: Disjoint FASTA input replaces the current input

- **WHEN** a user generates embeddings from one FASTA file and then selects a disjoint FASTA file
- **THEN** the second action SHALL use an embedding cache owned by the second FASTA content
- **AND** the downloaded bundle SHALL NOT contain the union of both inputs

#### Scenario: Sequence changes without changing its identifier

- **WHEN** a FASTA sequence changes while its identifier and selected embedder remain unchanged
- **THEN** the changed FASTA content SHALL select a different embedding cache
- **AND** the sequence SHALL be embedded from its current residues

### Requirement: Annotation cache reuse validates identifiers

The reduction pipeline SHALL reuse a retained annotation cache only when its identifier multiset matches the identifiers requested by the current run.

#### Scenario: Input identifiers change between runs

- **WHEN** a retained annotation cache contains identifiers from an earlier input
- **AND** the current run requests a different identifier multiset
- **THEN** annotations SHALL be fetched for the current identifiers
- **AND** incompatible cached rows SHALL NOT be returned as the current metadata
