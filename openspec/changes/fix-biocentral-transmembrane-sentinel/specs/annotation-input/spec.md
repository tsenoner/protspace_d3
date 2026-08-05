## ADDED Requirements

### Requirement: FASTA annotation inputs retain their sequences

The standalone annotation producer SHALL pass sequences supplied in a FASTA input to
sequence-backed annotation sources using the same canonical identifiers as its output.

#### Scenario: A FASTA identifier is not resolved by UniProt

- **WHEN** `protspace annotate` receives a FASTA entry whose identifier UniProt cannot
  resolve
- **THEN** the entry's FASTA sequence remains available to Biocentral and InterPro
- **AND** the hosted prep pipeline preserves that sequence when it passes its normalized
  FASTA to `protspace annotate`
