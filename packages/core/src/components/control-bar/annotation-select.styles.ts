import { css } from 'lit';
import { tokens } from '../../styles/tokens';
import { buttonMixin, inputMixin, dropdownMixin } from '../../styles/mixins';

/**
 * Annotation Select Component Styles
 *
 * Uses shared dropdown system from mixins with annotation-specific overrides.
 * The annotation dropdown has a search input that stays fixed, so we override
 * the dropdown menu to hide overflow and let the inner list container scroll.
 */
export const annotationSelectStyles = [
  tokens,
  buttonMixin,
  inputMixin,
  dropdownMixin,
  css`
    :host {
      display: inline-flex;
      position: relative;
      max-width: 100%;
    }

    .annotation-select-container {
      position: relative;
      display: inline-flex;
      width: 100%;
      max-width: 100%;
    }

    /* Ensure dropdown-trigger padding matches (inherited from dropdownMixin) */

    .dropdown-menu {
      overflow-y: auto;
      overflow-x: hidden;
    }

    /* Hug the content (the widest annotation row) rather than stretching to the trigger button's
       full width — matching the button left a large empty gap on short labels once the row's
       flex-grow label pushed the visibility toggle to the far edge. The floor keeps the search box
       comfortable; the cap stops very long names from over-widening the menu or running off-screen.
       Uses the .align-left specificity (0,2,0) to beat the shared dropdown mixin, which otherwise
       stretches the menu to the trigger width. The popover is fixed, so it is unaffected. */
    .dropdown-menu.align-left {
      min-width: 16rem;
      width: max-content;
      max-width: min(28rem, calc(100vw - 2rem));
    }

    .annotation-search-container {
      padding: var(--spacing-sm);
      border-bottom: var(--border-width) solid var(--border);
    }

    .annotation-search-input {
      width: 100%;
      padding: var(--input-padding-y) var(--input-padding-x);
      border: var(--border-width) solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
      font-size: var(--text-base);
      color: var(--muted);
      transition: var(--transition);
      box-sizing: border-box;
    }

    .annotation-search-input:focus {
      outline: none;
      box-shadow:
        0 0 0 1px var(--primary),
        0 0 0 3px var(--focus-ring-bg);
    }

    .annotation-list-container {
      max-height: 20rem;
      overflow-y: auto;
      overflow-x: hidden;
      scrollbar-width: thin;
      width: 100%;
    }

    .annotation-section {
      display: flex;
      flex-direction: column;
      width: 100%;
    }

    .annotation-section-header {
      position: sticky;
      top: 0;
      padding: var(--spacing-sm) var(--spacing-md) var(--spacing-xs);
      background: var(--surface);
      border-bottom: var(--border-width) solid var(--border);
      font-size: var(--text-sm);
      font-weight: var(--font-semibold);
      text-transform: uppercase;
      color: var(--muted);
      z-index: var(--z-base);
      box-sizing: border-box;
    }

    .annotation-section-items {
      display: flex;
      flex-direction: column;
      width: 100%;
    }

    /* Ensure dropdown items fill the full width and show the left border */
    .dropdown-item {
      width: 100%;
      box-sizing: border-box;
      margin: 0;
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .primary-indicator {
      flex: 0 0 0.85rem;
      width: 0.85rem;
      height: 0.85rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .primary-dot {
      display: block;
      width: 0.55rem;
      height: 0.55rem;
      border-radius: 50%;
      background: var(--primary);
    }

    .dropdown-item-label {
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .predicted-badge {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      font-size: 0.8rem;
      line-height: 1;
      cursor: default;
      user-select: none;
    }

    .eat-badge {
      flex: 0 0 auto;
      padding: 0.1rem 0.3rem;
      border: var(--border-width) solid var(--primary);
      border-radius: var(--radius);
      color: var(--primary);
      font-size: 0.65rem;
      font-weight: var(--font-semibold);
      line-height: 1;
      letter-spacing: 0.03em;
      user-select: none;
    }

    .annotation-info {
      flex: 0 0 auto;
      align-items: center;
    }

    /* Only the stats grid needs more room than the popover's text-only default. Widening every
       popover moves the viewport threshold at which a side popover flips to the other side of
       the panel, so description-only tooltips would change placement for nothing. */
    .annotation-info.has-stats {
      --info-popover-max-width: 320px;
    }

    /* Projection-quality statistics, projected into the ⓘ popover's slot. Styled here (not in
       the popover) because the markup lives in this component's shadow root. */
    /* One grid for the whole block (rows are display: contents) so every metric row shares the
       same column widths — a grid per row would size each row's columns to its own content and
       leave the values visibly ragged. minmax(0, 1fr) lets the label column shrink instead of
       pushing the value columns past the popover's max-width at large text sizes. */
    .annotation-stats {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto;
      gap: 0.15rem 0.5rem;
      margin-top: 0.4rem;
    }

    .stat-heading,
    .stat-group-label,
    .stat-caveat {
      grid-column: 1 / -1;
    }

    .stat-heading {
      margin-top: 0.35rem;
      font-weight: var(--font-semibold);
      overflow-wrap: anywhere;
    }

    .stat-heading:first-child {
      margin-top: 0;
    }

    .stat-group-label {
      margin-top: 0.2rem;
      color: var(--muted);
      font-size: 0.72rem;
    }

    .stat-caveat {
      margin-top: 0.35rem;
      color: var(--muted);
      font-size: 0.72rem;
    }

    .stat-metric {
      display: contents;
      font-variant-numeric: tabular-nums;
    }

    .stat-metric-embedding {
      min-width: 4.5rem;
      color: var(--muted);
      text-align: right;
    }

    .stat-lower-better {
      margin-left: 0.15rem;
      color: var(--muted);
    }

    /* The "↓" glyph is decorative; the words next to it carry the meaning for screen readers. */
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    .tooltip-toggle-slot {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.5rem;
      height: 1.5rem;
    }

    .tooltip-toggle-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.5rem;
      height: 1.5rem;
      padding: 0;
      background: none;
      border: none;
      border-radius: 0.25rem;
      color: var(--muted);
      cursor: pointer;
      transition: var(--transition);
    }

    .tooltip-toggle-btn:hover {
      color: var(--primary);
      background: var(--primary-alpha-10);
    }

    .tooltip-toggle-btn:focus-visible {
      outline: none;
      box-shadow: 0 0 0 2px var(--focus-ring-bg);
    }

    .tooltip-toggle-btn.is-active {
      color: var(--primary);
    }

    .no-results {
      padding: var(--spacing-lg);
      text-align: center;
      font-size: var(--text-base);
      color: var(--muted);
    }

    @media (max-width: 1200px) {
      :host,
      .annotation-select-container,
      .dropdown-trigger {
        width: 100%;
      }

      .dropdown-menu {
        left: 0;
        right: 0;
        width: 100%;
        max-width: 100%;
      }
    }
  `,
];
