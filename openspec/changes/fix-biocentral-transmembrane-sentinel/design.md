## Context

The Biocentral TMbed adapter currently serializes a valid negative prediction as the
categorical string `none`. The web bundle reader applies a shared missing-value policy
to all categorical annotations, and that policy intentionally treats `none`
case-insensitively as absent data. Consequently, a successfully computed negative
TMbed prediction is displayed as `N/A`, making it indistinguishable from proteins for
which no prediction was produced.

This behavior crosses the Python annotation producer, the parquet bundle contract, and
the TypeScript visualization consumer. The fix must preserve the generic importer's
established missing-value semantics while making newly produced TMbed data unambiguous.

## Goals / Non-Goals

**Goals:**

- Preserve a successful TMbed negative prediction as a visible categorical value in
  the web application.
- Keep genuinely absent Biocentral predictions represented as missing values.
- Exercise the producer value through the generated Python-to-TypeScript bundle
  contract so future sentinel collisions fail in CI.
- Keep user-facing annotation documentation aligned with the emitted vocabulary.

**Non-Goals:**

- Changing the generic web missing-value token set.
- Rewriting or migrating already generated `.parquetbundle` files.
- Changing TMbed topology interpretation for alpha helices, beta barrels, or mixed
  predictions.
- Adding contextual bundle-reader rules for one annotation name.

## Decisions

### Emit `non-transmembrane` for a successful negative TMbed prediction

The Biocentral adapter will return `non-transmembrane` when a TMbed result contains
neither an alpha-helical nor a beta-barrel segment. The phrase is explicit, is not in
the consumer's missing-value token set, and does not imply that the protein is soluble
or intracellular.

Alternatives considered:

- Keep `none` and remove it from the generic missing-value set. This would change the
  interpretation of arbitrary imported datasets and turn commonly used missing
  sentinels into visible categories.
- Translate `none` only when reading `predicted_transmembrane`. This would add
  domain-specific repair logic to the generic bundle consumer and would still leave
  the on-disk producer contract ambiguous.
- Use `soluble`. This is biologically narrower than "no predicted transmembrane
  segment" and can mislabel secreted or otherwise non-membrane proteins.

### Preserve empty-string output for an absent TMbed result

The adapter will continue returning an empty string when Biocentral provides no TMbed
prediction. This retains the current distinction at the producer: a completed negative
prediction is `non-transmembrane`, while an unavailable prediction remains missing.

### Cover both the adapter and the cross-language seam

A focused Python regression will assert the adapter vocabulary. The generated bundle
contract will derive its transmembrane fixture value from the real adapter and assert
that the TypeScript visualization data contains the category. This avoids a duplicated
hand-written constant that could allow producer and contract fixtures to drift apart.

## Risks / Trade-offs

- [Existing bundles still contain ambiguous `none` values] → Document that the fix
  applies to newly generated annotations; users must regenerate an affected bundle to
  recover the distinction.
- [Downstream consumers may expect the old literal] → Treat the value as a categorical
  contract correction and document the new vocabulary in both CLI and web metadata.
- [Contract fixture imports more producer code] → Use a minimal synthetic TMbed
  prediction and retain the real bundle CLI as the serialization boundary.

## Migration Plan

Deploy the producer vocabulary and web documentation together. No storage migration is
performed. Newly annotated bundles will carry `non-transmembrane`; existing bundles can
be regenerated with the updated CLI. Rollback consists of reverting the producer value
and its associated tests/documentation.

## Open Questions

None.
