## Why

Protein sequences that cannot be mapped to UniProt currently export an empty
`length` annotation even when the preparation pipeline already parsed their
sequence from FASTA. This discards reliable local metadata and causes ProtSpace
to display the sequence length as unavailable.

## What Changes

- Derive a missing sequence length from the matching local FASTA sequence.
- Apply the same fallback when a complete annotation cache satisfies the run.
- Preserve a non-empty length returned by UniProt.
- Keep the existing missing-value behavior when neither source provides a
  sequence length.
- Add regression coverage for the fallback and precedence behavior.

## Capabilities

### New Capabilities

- `fasta-sequence-metadata`: Defines how FASTA-derived sequence metadata fills
  gaps left by external annotation sources.

### Modified Capabilities

None.

## Impact

- Affects the Python annotation orchestration in
  `apps/protspace/src/protspace/data/annotations/manager.py` and the complete-cache
  branch in `apps/protspace/src/protspace/data/processors/pipeline.py`.
- Adds focused manager and warm-cache pipeline tests.
- Does not change public APIs, file formats, dependencies, or UniProt precedence.
