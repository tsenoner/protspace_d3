## Context

`TedRetriever._format_domains` serializes every TED domain as a label followed by its pLDDT score.
For domains whose AlphaFold/TED payload carries `cath_label: "-"`, the formatter currently replaces
the source label with `unclassified`. The serialized value is then consumed unchanged by the web
application, exports, and score-stripping logic.

## Goals / Non-Goals

**Goals:**

- Preserve TED's `-` label for domains without a CATH assignment.
- Retain pLDDT formatting and the existing semicolon-separated domain structure.
- Protect the behavior with a focused backend regression test and align user documentation.

**Non-Goals:**

- Changing how TED domains are fetched or how CATH names are resolved.
- Changing labeled TED domains, confidence values, or frontend rendering.
- Refactoring the annotation serialization format.

## Decisions

### Change the label at the retrieval boundary

The formatter will emit `-|{plddt}` in its existing unlabeled-domain branch. Fixing the value at
the backend boundary keeps every consumer consistent and avoids UI-specific substitutions.

Alternative considered: translate `unclassified` to `-` in the frontend. This would leave exports
and other consumers with the incorrect value and duplicate source-specific knowledge downstream.

### Preserve the surrounding serialized contract

The implementation will change only the fallback label. Score rounding, CATH-name encoding, and
semicolon joining remain unchanged, which keeps the behavioral impact limited to issue #342.

### Detect legacy formatted cache values without migrating them

When a `ted_domains` value with the old domain-boundary `unclassified|score` shape reaches the
annotation frame a run produces, ProtSpace will warn users to run `--refetch ted`. The check runs on
that produced frame rather than on the raw cache, at both reuse sites: the full-hit short-circuit and
the partial-fetch path, where `determine_sources_to_fetch` reports `ted: False` whenever the column
is present so the manager merges the legacy value straight through. Inspecting the output rather
than the cache makes the condition exact — no run-shape heuristic has to predict whether the stored
column survives the manager's filter to the requested annotations — and it is self-suppressing when
the run already refetches TED, because the refetched values no longer carry the old label.

The cache itself remains unchanged; automatic schema versioning or mutation would broaden this
source-label fix into cache migration infrastructure and could alter unrelated cached annotations.

## Risks / Trade-offs

- Existing consumers may group on the literal `unclassified` value → document the output change,
  cover the new literal with a regression test, and warn when the precise legacy cache shape is
  encountered.
- A broad formatter change could affect labeled domains → implement only the fallback-branch
  substitution and run the complete TED retriever test module.

## Migration Plan

No persistent bundle migration is required. However, the intermediate annotation cache stores
already-formatted `ted_domains` strings and does not re-run the formatter for cached columns. Users
reusing an existing output directory MUST run their `protspace prepare ... --refetch ted` command
once after upgrading; the targeted refetch replaces only the cached TED columns while preserving
other cached stages. Rolling back likewise requires `--refetch ted` to restore the previous literal.
The committed public phosphatase example bundle is refreshed in place because it stores formatted
TED values and is downloadable independently of the preparation cache.

## Open Questions

None.
