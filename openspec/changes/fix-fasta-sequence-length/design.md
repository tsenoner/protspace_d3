## Context

The reduction pipeline already parses every referenced FASTA file into an
identifier-to-sequence map and passes that map to `ProteinAnnotationManager`.
The manager currently consults local sequences only when preparing InterPro and
Biocentral requests. Its primary annotation rows still come from UniProt, so an
unmapped identifier retains UniProt's empty `length` value through merge,
transformation, and bundle output.

The fix must remain scoped to missing length metadata. Existing UniProt values
are authoritative, and the annotation manager must continue to work when no
FASTA sequence is available.

## Goals / Non-Goals

**Goals:**

- Fill an empty sequence length from the matching local FASTA sequence.
- Preserve non-empty UniProt sequence lengths.
- Apply the fallback before annotation rows are merged and formatted.
- Protect both fallback and precedence behavior with focused tests.

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

## Risks / Trade-offs

- **[Identifier mismatch prevents fallback]** → Continue using the pipeline's
  existing `parse_identifier` normalization and require an exact key match in
  the manager; do not add a second normalization policy.
- **[Mutation leaks into retriever or cache data]** → Return copied
  `ProteinAnnotations` values only for rows that receive the fallback.
- **[Mapped lengths are accidentally overwritten]** → Add a focused
  precedence test alongside the regression test.

## Migration Plan

No data or configuration migration is required. Deploy the Python package with
the fallback; rollback consists of reverting the manager enrichment and its
tests.

## Open Questions

None.
