/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import './category-score-strip';
import type { ScoreStripPoint } from './category-score-strip';

type ScoreStripElement = HTMLElement & {
  points: ScoreStripPoint[];
  highlighted: string | null;
  label: string;
  domain: [number, number];
  higherIsBetter: boolean;
  updateComplete: Promise<unknown>;
};

const POINTS: ScoreStripPoint[] = [
  { category: 'Elapidae', value: 0.81, color: '#ff0000' },
  { category: 'Viperidae', value: -0.15, color: '#00ff00' },
];

async function setup(points: ScoreStripPoint[] = POINTS): Promise<ScoreStripElement> {
  const el = document.createElement('protspace-score-strip') as ScoreStripElement;
  el.points = points;
  el.label = 'Silhouette';
  el.domain = [-1, 1];
  el.higherIsBetter = true;
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

describe('protspace-score-strip', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('draws one dot per category, in that category colour', async () => {
    const el = await setup();

    const dots = Array.from(el.shadowRoot!.querySelectorAll('circle'));
    expect(dots).toHaveLength(2);
    expect(dots.map((dot) => dot.getAttribute('fill'))).toEqual(['#ff0000', '#00ff00']);
  });

  it('positions dots along the fixed domain, not the data range', async () => {
    // A [-1, 1] silhouette axis must not rescale to the data, or two datasets
    // would not be comparable.
    const el = await setup();

    const dots = Array.from(el.shadowRoot!.querySelectorAll('circle'));
    const [first, second] = dots.map((dot) => Number(dot.getAttribute('cx')));
    // 0.81 sits far right of -0.15 on a [-1, 1] axis.
    expect(first).toBeGreaterThan(second);
  });

  it('emits strip-hover with the category on pointer enter, and null on leave', async () => {
    const el = await setup();
    const seen: Array<string | null> = [];
    el.addEventListener('strip-hover', (event) =>
      seen.push((event as CustomEvent<{ category: string | null }>).detail.category),
    );

    const dot = el.shadowRoot!.querySelector('circle')!;
    dot.dispatchEvent(new Event('mouseenter', { bubbles: false }));
    dot.dispatchEvent(new Event('mouseleave', { bubbles: false }));

    expect(seen).toEqual(['Elapidae', null]);
  });

  it('marks the highlighted dot so the legend can drive it', async () => {
    const el = await setup();
    el.highlighted = 'Viperidae';
    await el.updateComplete;

    const highlighted = el.shadowRoot!.querySelectorAll('circle.is-highlighted');
    expect(highlighted).toHaveLength(1);
    expect(highlighted[0].getAttribute('data-category')).toBe('Viperidae');
  });

  it('renders nothing when there are no points', async () => {
    const el = await setup([]);

    expect(el.shadowRoot!.querySelector('svg')).toBeNull();
  });

  it('centres every dot when the domain is degenerate', async () => {
    // All categories scoring identically would otherwise divide by a zero span.
    const el = await setup([
      { category: 'A', value: 2, color: '#111111' },
      { category: 'B', value: 2, color: '#222222' },
    ]);
    el.domain = [2, 2];
    await el.updateComplete;

    const cx = Array.from(el.shadowRoot!.querySelectorAll('circle')).map((dot) =>
      Number(dot.getAttribute('cx')),
    );
    expect(cx).toEqual([50, 50]);
  });

  it('shows "lower is better" when higherIsBetter is false', async () => {
    const el = await setup();
    el.higherIsBetter = false;
    await el.updateComplete;

    expect(el.shadowRoot!.textContent).toContain('lower is better');
  });
});
