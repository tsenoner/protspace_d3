import { css } from 'lit';
import { srOnlyMixin } from '../../../styles/mixins';

export const projectionMetadataStyles = [
  srOnlyMixin,
  css`
    :host {
      position: absolute;
      top: 0.5rem;
      left: 0.5rem;
      z-index: 10;

      /* protspace-info-popover is shared with the legend and themes itself from these two
         hooks, defaulting to a neutral grey (#6b7280). This panel is built on the cool slate
         ramp below, so an unthemed info icon sat a whole hue family away from the label
         beside it. Set them here rather than restyling the popover: the component already
         exposes the seam, and the legend keeps its own values. */
      --legend-text-secondary: #64748b;
      --legend-text-color: #334155;
    }

    .trigger {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      padding: 0;
      background: var(--protspace-tooltip-bg, rgba(255, 255, 255, 0.95));
      border: 1px solid var(--protspace-tooltip-border, #d9e2ec);
      border-radius: 0.375rem;
      cursor: pointer;
      box-shadow: var(--protspace-tooltip-shadow, 0 6px 16px rgba(0, 0, 0, 0.08));
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .trigger:hover {
      background: rgba(255, 255, 255, 1);
      border-color: var(--protspace-highlight-color, #00a3e0);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
      transform: scale(1.05);
    }

    .trigger:focus-visible {
      outline: 2px solid var(--primary-alpha-30);
      outline-offset: 2px;
    }

    .trigger .icon {
      width: 1rem;
      height: 1rem;
      stroke: currentColor;
      fill: none;
      stroke-width: 1.5;
      color: #475569;
      transition: color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .trigger:hover .icon,
    .trigger:focus-visible .icon {
      color: var(--protspace-highlight-color, #00a3e0);
    }

    .content {
      position: absolute;
      top: calc(100% + 0.5rem);
      left: 0;
      min-width: 15rem;
      max-width: 20rem;
      background: var(--protspace-tooltip-bg, rgba(255, 255, 255, 0.95));
      border: 1px solid var(--protspace-tooltip-border, #d9e2ec);
      border-radius: 0.5rem;
      box-shadow:
        var(--protspace-tooltip-shadow, 0 6px 16px rgba(0, 0, 0, 0.08)),
        0 10px 40px rgba(0, 0, 0, 0.1);
      pointer-events: none;
      opacity: 0;
      visibility: hidden;
      transform: translateY(-0.25rem);
      transition:
        opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1),
        transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
        visibility 0.2s;
    }

    /* Invisible bridge that covers the gap between trigger and popover so
     the mouse can travel from the button into the popover without losing
     :host(:hover). */
    .content::before {
      content: '';
      position: absolute;
      bottom: 100%;
      left: 0;
      width: 100%;
      height: 0.5rem; /* matches the gap: top: calc(100% + 0.5rem) */
    }

    :host(:hover) .content,
    .trigger:focus-visible + .content {
      pointer-events: auto;
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .header {
      padding: 0.625rem 0.75rem;
      font-size: 0.8125rem;
      font-weight: 600;
      color: #334155;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
      border-radius: 0.5rem 0.5rem 0 0;
    }

    dl {
      margin: 0;
      padding: 0.625rem 0.75rem;
    }

    .item {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.75rem;
      margin-bottom: 0.5rem;
      font-size: 0.75rem;
      line-height: 1.5;
    }

    .item:last-child {
      margin-bottom: 0;
    }

    dt {
      font-weight: 500;
      color: #475569;
      white-space: nowrap;
    }

    dd {
      margin: 0;
      color: #64748b;
      text-align: right;
      word-break: break-word;
    }

    /* Second section of the panel: the same header bar, but mid-card, so it gets a top rule and
     loses the card's rounded top corners. */
    .stats-header {
      border-top: 1px solid #e2e8f0;
      border-radius: 0;
    }

    /* One grid for the whole block (rows are display: contents) so every metric row shares the
     same column widths; a grid per row would size each row's columns to its own content and
     leave the values visibly ragged. minmax(0, 1fr) lets the label column shrink instead of
     pushing the value columns past the panel's max-width at large text sizes. */
    .annotation-stats {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto;
      gap: 0.15rem 0.5rem;
      padding: 0.625rem 0.75rem;
      font-size: 0.75rem;
      line-height: 1.5;
      color: #475569;
    }

    .stat-heading,
    .stat-group-label,
    .stat-caveat {
      grid-column: 1 / -1;
    }

    .stat-heading {
      margin-top: 0.35rem;
      font-weight: 500;
      color: #334155;
      overflow-wrap: anywhere;
    }

    .stat-heading:first-child {
      margin-top: 0;
    }

    .stat-group-label,
    .stat-caveat {
      color: #94a3b8;
      font-size: 0.6875rem;
    }

    .stat-group-label {
      margin-top: 0.2rem;
    }

    .stat-caveat {
      margin-top: 0.35rem;
    }

    .stat-metric {
      display: contents;
      font-variant-numeric: tabular-nums;
    }

    .stat-metric-embedding {
      min-width: 4.5rem;
      color: #94a3b8;
      text-align: right;
    }

    /* Agreement metrics never have a ceiling, and neither does a bundle prepared without an
     embedding, and reserving 4.5rem for a blank cell steals it from the label column. */
    .stat-metric-embedding.is-empty {
      min-width: 0;
    }

    .stat-direction {
      margin-left: 0.15rem;
      color: #94a3b8;
    }

    .section-heading {
      padding: 0 0.75rem;
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-secondary, #666);
      margin-top: 0.625rem;
      margin-bottom: 0.25rem;
    }

    /* display: contents (not a nested grid) so these three spans land in \`.annotation-stats\`'s
     own grid columns, the same way \`.stat-metric\`'s cells do. A nested grid here would size its
     own "auto" columns from just these two header words, which would not match the value columns'
     widths below and would only ever occupy the outer grid's first column besides. */
    .stat-columns {
      display: contents;
    }

    .stat-columns span {
      font-size: 0.6875rem;
      color: var(--text-secondary, #666);
    }

    .stat-columns span:not(:first-child) {
      text-align: right;
    }

    .stat-metric-value {
      text-align: right;
    }
  `,
];
