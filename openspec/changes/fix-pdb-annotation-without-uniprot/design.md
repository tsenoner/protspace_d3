## Context

The UniProt retriever emits the same empty-string representation for every unavailable field on an unresolved identifier and for a genuinely absent field on a resolved UniProt entry. `AnnotationTransformer` currently converts `xref_pdb` using only that field, so both cases become `False`. The transformed annotation dictionary already includes `uniprot_kb_id`, which is populated for resolved entries and empty for unresolved or deleted entries.

## Goals / Non-Goals

**Goals:**

- Preserve the three evidence states for PDB availability: present, confirmed absent, and unavailable.
- Keep the existing annotation schema and frontend missing-value contract.
- Cover the distinction with the smallest focused regression test.

**Non-Goals:**

- Change UniProt accession recognition or inactive-entry resolution.
- Refactor the annotation model or other boolean-like annotations.
- Change the bundle wire format or frontend rendering.

## Decisions

### Use the resolved UniProt identifier as transformation context

The PDB transformation will consider both `xref_pdb` and the sibling `uniprot_kb_id` field. An empty `uniprot_kb_id` means the UniProt-derived assertion is unavailable and therefore preserves an empty `xref_pdb`; a populated identifier allows the existing true/false conversion.

This keeps provenance at the point where both fields are already available. The alternative of omitting `xref_pdb` from unresolved retriever records would make annotation dictionaries non-uniform and would still leave cached or partially populated records ambiguous. Introducing a new provenance field would be broader than this issue because `uniprot_kb_id` already provides the necessary signal.

### Preserve the existing empty-string missing representation

The producer will emit `""` rather than a new sentinel such as `None` or `N/A`. Existing bundle creation normalizes missing cells to empty strings, and the TypeScript ingestion boundary already converts empty strings to its canonical N/A category. This avoids a wire-format or frontend change.

## Risks / Trade-offs

- **[Risk] A malformed resolved record could omit `uniprot_kb_id`.** → Treat it as unavailable rather than asserting a potentially false negative; this is the conservative evidence interpretation.
- **[Risk] Existing consumers may have counted unmapped values as `False`.** → The change intentionally corrects that semantic category while leaving mapped entries unchanged.

## Migration Plan

No data migration is required. Newly generated or explicitly refreshed annotations gain the corrected missing value; existing bundles remain readable. Rollback is a single transformer change because no schema or dependency changes are introduced.

## Open Questions

None.
