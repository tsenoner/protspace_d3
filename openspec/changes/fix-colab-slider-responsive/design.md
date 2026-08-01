## Context

The Generate cell renders each dimensionality-reduction parameter group as an `ipywidgets.VBox` inside a wrapping `HBox`. Each group currently declares `flex: 1 1 220px`, while a rendered slider's description, value readout, and internal spacing consume about 228 px before any track length is available. With UMAP and t-SNE enabled, three groups therefore remain on one row at widths where their tracks collapse to nearly zero.

The layout lives inside the committed notebook JSON, and the fix must work in Colab without adding CSS, JavaScript, or dependencies.

## Goals / Non-Goals

**Goals:**

- Wrap parameter groups before their slider tracks become unusable.
- Preserve the existing controls, values, callbacks, and ordinary desktop layout.
- Add a focused automated guard and repeatable rendered-browser verification.

**Non-Goals:**

- Redesigning other notebook sections or controls.
- Changing dimensionality-reduction defaults or processing behavior.
- Adding a general notebook testing framework or external dependency.

## Decisions

1. Increase the parameter-group flex basis from 220 px to 300 px. The measured fixed slider chrome is about 228 px, so a 300 px basis preserves roughly 72 px of track before the flex container wraps. A larger basis would wrap earlier but consume unnecessary vertical space; changing slider label widths would alter the established alignment and would not address every label/readout combination.
2. Keep `flex-flow: row wrap` and the existing `overflow: hidden`. Wrapping is already the intended responsive mechanism; correcting its threshold is smaller and less risky than injecting breakpoint CSS into Colab's per-cell widget frame.
3. Guard the responsive contract with a focused Python test that parses the committed notebook cell and asserts a minimum 300 px flex basis. Rendered browser verification at desktop and compressed widths supplies the end-to-end evidence that the structural contract produces usable tracks.

## Risks / Trade-offs

- [Risk] Two cards may wrap sooner in unusually narrow notebook panes. → This is the intended trade-off: added vertical space preserves accurate slider interaction.
- [Risk] Widget implementations can change their fixed internal chrome. → Keep a margin above the measured 228 px and verify actual track geometry in a real browser.
- [Risk] Notebook editors can reserialize unrelated JSON. → Make the source edit surgically and review the notebook diff before committing.

## Migration Plan

No migration is required. The notebook-only layout value is applied the next time the Generate cell runs; reverting the one-line basis change restores the previous behavior.

## Open Questions

None.
