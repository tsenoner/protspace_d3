## Context

The reduction pipeline already parses every referenced FASTA file into an
identifier-to-sequence map and passes that map to `ProteinAnnotationManager`.
The manager currently consults local sequences only when preparing InterPro and
Biocentral requests. Its primary annotation rows still come from UniProt, so an
unmapped identifier retains UniProt's empty `length` value through merge,
transformation, and bundle output.

When every requested annotation column is present in `all_annotations.parquet`,
the reduction pipeline returns that cached DataFrame before constructing the
manager. Therefore the manager-only fallback does not repair empty lengths on
normal warm-cache reruns.

The standalone `protspace annotate` command, which is also the annotation path
used by the hosted preparation service, extracts normalized identifiers from a
FASTA input but does not pass its sequences to the manager. The manager fallback
therefore cannot run on that path even though the sequence data is available.

The fix must remain scoped to missing length metadata. Existing UniProt values
are authoritative, and the annotation manager must continue to work when no
FASTA sequence is available.

## Goals / Non-Goals

**Goals:**

- Fill an empty sequence length from the matching local FASTA sequence.
- Preserve non-empty UniProt sequence lengths.
- Apply the fallback before annotation rows are merged and formatted.
- Apply the fallback when `protspace annotate` receives FASTA input.
- Apply the fallback to complete cache hits without refetching API annotations.
- Protect both fallback and precedence behavior with focused tests.
- Keep the annotation references synchronized with the fallback and precedence
  behavior.

**Non-Goals:**

- Reconcile differences between mapped UniProt and local FASTA sequences.
- Change FASTA parsing or identifier normalization.
- Populate other missing UniProt annotations from FASTA.
- Alter bundle schemas or frontend missing-value rendering.

## Decisions

### Enrich the primary annotation rows in the manager

Immediately after UniProt annotations are fetched or loaded from cache, the
manager will copy each row whose `length` is empty and whose identifier has a
non-empty local sequence, setting `length` to the decimal string form of
`len(sequence)`. Rows that need no fallback remain unchanged.

This keeps the fallback at the first boundary that owns both inputs and makes
the corrected value available to every downstream merge and output path.

Alternatives considered:

- A separate FASTA annotation source would require unnecessary merger and
  precedence machinery for one field.
- Passing local sequences into `UniProtRetriever` would couple an external API
  client to local-file data and obscure the retriever's responsibility.
- Filling the DataFrame after formatting would fix only one output path and
  leave earlier consumers with inconsistent annotation rows.

### Treat FASTA length strictly as a fallback

Any non-empty UniProt `length` value remains unchanged, even if it differs from
the local sequence length. The issue concerns unmapped proteins; defining
canonical-versus-construct reconciliation is outside this change.

### Enrich complete cache hits before returning them

When the cache contains all requested columns and annotation refetching is not
requested, the pipeline will apply the same missing-only length rule to the
selected cached DataFrame before merging custom CSV annotations. This preserves
the cache-hit fast path and avoids API calls while ensuring warm-cache output
matches cold-cache output.

The manager and pipeline cache branch will share the scalar precedence rule so
that an empty value is filled from a matching non-empty sequence and every
non-empty cached or UniProt value is retained. The cached Parquet file itself is
not rewritten on a read-only complete-cache hit; the derived value is local to
the current output, preserving existing cache lifecycle semantics.

### Supply sequences at the standalone annotation boundary

When `protspace annotate` receives FASTA input, it will parse the file into an
identifier-to-sequence map and normalize each key with the same
`parse_identifier` policy already used to extract annotation identifiers and by
the reduction pipeline. The command will pass that map to
`ProteinAnnotationManager`; HDF5 input continues to provide no local sequences.

This repairs both direct CLI usage and the hosted preparation service without
duplicating fallback logic or changing FASTA parsing and normalization policy.

## Risks / Trade-offs

- **[Identifier mismatch prevents fallback]** → Continue using the pipeline's
  existing `parse_identifier` normalization and require an exact key match in
  the manager; do not add a second normalization policy.
- **[Mutation leaks into retriever or cache data]** → Return copied
  `ProteinAnnotations` values only for rows that receive the fallback.
- **[Mapped lengths are accidentally overwritten]** → Add a focused
  precedence test alongside the regression test, including a warm-cache row.
- **[Warm-cache fix triggers network work or rewrites cache]** → Keep the
  complete-cache early-return branch and enrich a copy of its selected DataFrame
  without constructing the annotation manager or persisting the derived value.
- **[Standalone identifiers and sequence keys diverge]** → Normalize parsed
  FASTA keys with the existing `parse_identifier` helper before passing them to
  the manager.

## Migration Plan

No data or configuration migration is required. Deploy the Python package with
the fallback; rollback consists of reverting the manager enrichment and its
tests.

## Open Questions

None.
