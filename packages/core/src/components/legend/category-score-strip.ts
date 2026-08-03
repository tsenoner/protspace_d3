import { LitElement, html, css, svg, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { customElement } from '../../utils/safe-custom-element';

/** One category's position on a score axis, painted in its legend colour. */
export interface ScoreStripPoint {
  category: string;
  value: number;
  color: string;
  /** The same metric on the source embedding, this category's ceiling, shown in the tooltip. */
  ceiling?: number | null;
}

const STRIP_HEIGHT = 44;
const AXIS_Y = 22;
const DOT_RADIUS = 5;
/**
 * Percent inset at either end of the axis, so the extreme dots sit inside the strip
 * rather than on its edge. A percentage of the rendered width, not pixels: the axis is
 * fluid while the height is fixed, so this does not track `DOT_RADIUS`. Dots never clip
 * regardless, because the svg is `overflow: visible`.
 */
const PADDING = 10;

/**
 * One metric's distribution across an annotation's categories: a dot per category on a
 * shared axis, coloured to match its legend row.
 *
 * A dot strip rather than a binned histogram. At the cardinalities this tool sees (most
 * datasets under 30 categories) a histogram is a handful of bars of height 0 to 5, and one
 * bar maps to several legend rows, so hovering cannot say which of them is which. One dot
 * per category gives a 1:1 mapping and needs no binning; past roughly 100 categories the
 * dots overlap into a density smear, which is the histogram's behaviour recovered anyway.
 *
 * Stateless: props in, `strip-hover` out. The legend owns the highlight.
 */
@customElement('protspace-score-strip')
class ProtspaceScoreStrip extends LitElement {
  @property({ type: Array }) points: ScoreStripPoint[] = [];
  /** Category to emphasise, driven by the legend's hover state. */
  @property({ type: String }) highlighted: string | null = null;
  @property({ type: String }) label = '';
  /**
   * Axis bounds. Fixed at [-1, 1] for silhouette so every dataset's strip is directly
   * comparable; derived from the data for unbounded metrics such as Davies-Bouldin.
   */
  @property({ type: Array }) domain: [number, number] = [-1, 1];
  @property({ type: Boolean, attribute: 'higher-is-better' }) higherIsBetter = true;

  static styles = css`
    :host {
      display: block;
    }

    .strip-header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--legend-text-secondary, #666);
      padding: 0 0.25rem;
    }

    .strip-label {
      font-weight: 600;
      color: var(--legend-text-color, #222);
    }

    svg {
      display: block;
      width: 100%;
      overflow: visible;
    }

    .axis {
      stroke: var(--legend-border, #ddd);
      stroke-width: 1;
    }

    circle {
      stroke: var(--legend-bg, #fff);
      stroke-width: 1;
      cursor: pointer;
    }

    circle.is-highlighted {
      stroke: var(--legend-text-color, #222);
      stroke-width: 2;
    }

    .bound {
      font-size: 0.6875rem;
      fill: var(--legend-text-secondary, #666);
    }
  `;

  render() {
    if (this.points.length === 0) return nothing;

    const [min, max] = this.domain;
    // A degenerate domain (every category identical) would divide by zero; centre instead.
    const span = max - min;
    // Percent of the SVG's own (fluid) width, not a viewBox coordinate: the strip has no
    // viewBox, so an explicit `height` attribute alone fixes its height regardless of the
    // panel width, and `%` keeps this positioning in step with that width unscaled.
    const position = (value: number): number =>
      span === 0 ? 50 : PADDING + ((value - min) / span) * (100 - PADDING * 2);

    return html`
      <div class="strip-header">
        <span class="strip-label">${this.label}</span>
        <span>${this.higherIsBetter ? 'higher is better' : 'lower is better'}</span>
      </div>
      <svg height="${STRIP_HEIGHT}" role="img" aria-label="${this.label} per category">
        <line class="axis" x1="${PADDING}%" y1="${AXIS_Y}" x2="${100 - PADDING}%" y2="${AXIS_Y}" />
        ${this.points.map(
          (point) =>
            svg`<circle
            class="${point.category === this.highlighted ? 'is-highlighted' : ''}"
            data-category="${point.category}"
            cx="${position(point.value)}%"
            cy="${AXIS_Y}"
            r="${DOT_RADIUS}"
            fill="${point.color}"
            @mouseenter=${() => this._emitHover(point.category)}
            @mouseleave=${() => this._emitHover(null)}
            @click=${() => this._emitClick(point.category)}
          ><title>${point.category}: ${point.value.toFixed(3)}${
            point.ceiling == null ? '' : ` (embedding ceiling ${point.ceiling.toFixed(3)})`
          }</title></circle>`,
        )}
        <text class="bound" x="${PADDING}%" y="${STRIP_HEIGHT - 4}" text-anchor="start">
          ${this._formatBound(min)}
        </text>
        <text class="bound" x="${100 - PADDING}%" y="${STRIP_HEIGHT - 4}" text-anchor="end">
          ${this._formatBound(max)}
        </text>
      </svg>
    `;
  }

  /** Bounds are axis furniture, so they stay short: two decimals, no trailing noise. */
  private _formatBound(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }

  private _emitHover(category: string | null): void {
    this.dispatchEvent(
      new CustomEvent<{ category: string | null }>('strip-hover', {
        detail: { category },
        bubbles: true,
      }),
    );
  }

  private _emitClick(category: string): void {
    this.dispatchEvent(
      new CustomEvent<{ category: string }>('strip-click', {
        detail: { category },
        bubbles: true,
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'protspace-score-strip': ProtspaceScoreStrip;
  }
}
