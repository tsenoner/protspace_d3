## ADDED Requirements

### Requirement: Missing sequence length falls back to FASTA

The annotation pipeline SHALL derive a protein's sequence length from its
matching local FASTA sequence when the primary annotation source does not
provide a sequence length.

#### Scenario: Unmapped protein has a FASTA sequence

- **WHEN** a protein's UniProt annotation has an empty sequence length and a
  matching non-empty FASTA sequence is available
- **THEN** the output length equals the number of residues in that FASTA
  sequence

#### Scenario: UniProt provides a sequence length

- **WHEN** a protein has both a non-empty UniProt sequence length and a matching
  FASTA sequence
- **THEN** the output retains the UniProt sequence length

#### Scenario: No source provides a sequence length

- **WHEN** a protein's UniProt annotation has an empty sequence length and no
  matching non-empty FASTA sequence is available
- **THEN** the output sequence length remains missing
