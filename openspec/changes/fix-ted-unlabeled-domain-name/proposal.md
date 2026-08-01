## Why

TED represents domains without a CATH assignment with the label `-`, but ProtSpace rewrites that
label to `unclassified`. Preserving TED's label makes ProtSpace output consistent with the source
resource and avoids presenting a different classification term to users.

## What Changes

- Emit `-` for a TED domain whose CATH label is missing or `-`.
- Preserve the domain's pLDDT score and the existing semicolon-separated multi-domain format.
- Update the TED annotation documentation and regression coverage to describe the source-aligned
  label.

## Capabilities

### New Capabilities

- `ted-domain-annotations`: Defines how ProtSpace serializes TED domains with and without CATH
  assignments.

### Modified Capabilities

None.

## Impact

- Affected code: the Python TED annotation retriever and its focused tests.
- Affected documentation: generated annotation details and the ProtSpace Python package annotation
  reference.
- APIs and dependencies: no endpoint or dependency changes; only the serialized label for
  unlabeled TED domains changes.
