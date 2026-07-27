/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import './annotation-select';
import './control-bar';
import type { ProjectionStatisticRow } from '@protspace/utils';
import type { ProtspaceData } from './types';

type AnnotationSelectElement = HTMLElement & {
  annotations: string[];
  selectedAnnotation: string;
  selectedProjection: string;
  tooltipAnnotations: string[];
  eatAnnotations: string[];
  statistics: readonly ProjectionStatisticRow[];
  updateComplete: Promise<unknown>;
};

async function setup(initial: Partial<AnnotationSelectElement> = {}) {
  const el = document.createElement('protspace-annotation-select') as AnnotationSelectElement;
  el.annotations = initial.annotations ?? ['gene_name', 'pfam', 'species'];
  el.selectedAnnotation = initial.selectedAnnotation ?? 'pfam';
  el.selectedProjection = initial.selectedProjection ?? '';
  el.tooltipAnnotations = initial.tooltipAnnotations ?? [];
  el.eatAnnotations = initial.eatAnnotations ?? [];
  el.statistics = initial.statistics ?? [];
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

async function openDropdown(el: AnnotationSelectElement): Promise<void> {
  const trigger = el.shadowRoot!.querySelector('.dropdown-trigger') as HTMLButtonElement;
  trigger.click();
  await el.updateComplete;
}

function getRowFor(el: AnnotationSelectElement, annotation: string): HTMLElement {
  const items = Array.from(el.shadowRoot!.querySelectorAll('.dropdown-item')) as HTMLElement[];
  const row = items.find((item) => item.getAttribute('data-annotation') === annotation);
  if (!row) {
    throw new Error(`row for annotation "${annotation}" not found`);
  }
  return row;
}

describe('protspace-annotation-select tooltip extras', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders a primary indicator only on the selected row', async () => {
    const el = await setup();
    await openDropdown(el);

    const primary = getRowFor(el, 'pfam');
    const other = getRowFor(el, 'gene_name');

    expect(primary.querySelector('.primary-dot')).not.toBeNull();
    expect(other.querySelector('.primary-dot')).toBeNull();
  });

  it('marks only EAT-capable annotation options with a text badge', async () => {
    const el = await setup({ eatAnnotations: ['pfam'] });
    await openDropdown(el);

    expect(getRowFor(el, 'pfam').querySelector('.eat-badge')?.textContent).toBe('EAT');
    expect(getRowFor(el, 'species').querySelector('.eat-badge')).toBeNull();
  });

  it('hides the tooltip toggle on the primary row and shows it on other rows', async () => {
    const el = await setup();
    await openDropdown(el);

    const primary = getRowFor(el, 'pfam');
    const other = getRowFor(el, 'gene_name');

    expect(primary.querySelector('.tooltip-toggle-btn')).toBeNull();
    expect(other.querySelector('.tooltip-toggle-btn')).not.toBeNull();
  });

  it('reflects active state on the toggle for annotations in tooltipAnnotations', async () => {
    const el = await setup({ tooltipAnnotations: ['gene_name'] });
    await openDropdown(el);

    const activeBtn = getRowFor(el, 'gene_name').querySelector(
      '.tooltip-toggle-btn',
    ) as HTMLButtonElement;
    const inactiveBtn = getRowFor(el, 'species').querySelector(
      '.tooltip-toggle-btn',
    ) as HTMLButtonElement;

    expect(activeBtn.classList.contains('is-active')).toBe(true);
    expect(activeBtn.getAttribute('aria-pressed')).toBe('true');
    expect(inactiveBtn.classList.contains('is-active')).toBe(false);
    expect(inactiveBtn.getAttribute('aria-pressed')).toBe('false');
  });

  it('dispatches tooltip-annotation-toggle when the toggle is clicked, without selecting', async () => {
    const el = await setup();
    await openDropdown(el);

    const toggleEvents: CustomEvent[] = [];
    const selectEvents: CustomEvent[] = [];
    el.addEventListener('tooltip-annotation-toggle', (e) => toggleEvents.push(e as CustomEvent));
    el.addEventListener('annotation-select', (e) => selectEvents.push(e as CustomEvent));

    const btn = getRowFor(el, 'gene_name').querySelector(
      '.tooltip-toggle-btn',
    ) as HTMLButtonElement;
    btn.click();
    await el.updateComplete;

    expect(toggleEvents).toHaveLength(1);
    expect(toggleEvents[0].detail).toEqual({
      annotation: 'gene_name',
      active: true,
      tooltipAnnotations: ['gene_name'],
    });
    expect(selectEvents).toHaveLength(0);
    expect(el.tooltipAnnotations).toEqual(['gene_name']);
  });

  it('removes an annotation from tooltipAnnotations on a second toggle click', async () => {
    const el = await setup({ tooltipAnnotations: ['gene_name'] });
    await openDropdown(el);

    const events: CustomEvent[] = [];
    el.addEventListener('tooltip-annotation-toggle', (e) => events.push(e as CustomEvent));

    const btn = getRowFor(el, 'gene_name').querySelector(
      '.tooltip-toggle-btn',
    ) as HTMLButtonElement;
    btn.click();
    await el.updateComplete;

    expect(events[0].detail).toEqual({
      annotation: 'gene_name',
      active: false,
      tooltipAnnotations: [],
    });
    expect(el.tooltipAnnotations).toEqual([]);
  });

  it('clicking the row label selects the annotation as primary', async () => {
    const el = await setup();
    await openDropdown(el);

    const selectSpy = vi.fn();
    el.addEventListener('annotation-select', selectSpy);

    (getRowFor(el, 'gene_name').querySelector('.dropdown-item-label') as HTMLElement).click();
    await el.updateComplete;

    expect(selectSpy).toHaveBeenCalledTimes(1);
    expect((selectSpy.mock.calls[0][0] as CustomEvent).detail).toEqual({ annotation: 'gene_name' });
  });
});

describe('protspace-annotation-select statistics info icon', () => {
  const statRow = (over: Partial<ProjectionStatisticRow> = {}): ProjectionStatisticRow => ({
    space_kind: 'projection',
    space_name: 'umap',
    annotation: 'major_group',
    stat_family: 'annotation_validity',
    label_kind: 'annotation',
    metric: 'silhouette',
    metric_kind: 'validity',
    value: 0.42,
    ...over,
  });

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // Neither annotation ships built-in docs, so the ⓘ icon here can only come from statistics.
  const CUSTOM_ANNOTATIONS = ['major_group', 'seq_start'];

  type PopoverEl = HTMLElement & { updateComplete: Promise<unknown> };

  /** Click the row's ⓘ button open and return the popover host, so assertions see rendered DOM. */
  async function openPopoverFor(
    el: Awaited<ReturnType<typeof setup>>,
    annotation: string,
  ): Promise<PopoverEl> {
    const pop = getRowFor(el, annotation).querySelector('protspace-info-popover') as PopoverEl;
    const icon = pop.shadowRoot!.querySelector('.info-button') as HTMLButtonElement;
    icon.click();
    await pop.updateComplete;
    return pop;
  }

  it('shows the ⓘ icon only for annotations that have a statistic', async () => {
    const el = await setup({
      annotations: CUSTOM_ANNOTATIONS,
      statistics: [statRow()],
      selectedProjection: 'umap',
    });
    await openDropdown(el);

    expect(getRowFor(el, 'major_group').querySelector('protspace-info-popover')).not.toBeNull();
    expect(getRowFor(el, 'seq_start').querySelector('protspace-info-popover')).toBeNull();
  });

  it('shows no icon when the statistics are for a different projection', async () => {
    const el = await setup({
      annotations: CUSTOM_ANNOTATIONS,
      statistics: [statRow()],
      selectedProjection: 'pca',
    });
    await openDropdown(el);

    expect(getRowFor(el, 'major_group').querySelector('protspace-info-popover')).toBeNull();
  });

  it('renders the metric, its value and the embedding ceiling in the popover', async () => {
    const el = await setup({
      annotations: CUSTOM_ANNOTATIONS,
      statistics: [
        statRow(),
        statRow({ space_kind: 'embedding', space_name: 'prot_t5', value: 0.1 }),
      ],
      selectedProjection: 'umap',
    });
    await openDropdown(el);

    const stats = getRowFor(el, 'major_group').querySelector('.annotation-stats') as HTMLElement;
    expect(stats.textContent).toContain('Separation in umap');
    expect(stats.textContent).toContain('Silhouette');
    expect(stats.textContent).toContain('0.420');
    expect(stats.textContent).toContain('emb 0.100');
  });

  it('conveys "lower is better" as text, not only as a title attribute', async () => {
    const el = await setup({
      annotations: CUSTOM_ANNOTATIONS,
      statistics: [statRow({ metric: 'davies_bouldin', value: 1.5 })],
      selectedProjection: 'umap',
    });
    await openDropdown(el);

    // The ↓ glyph alone reaches neither screen readers nor touch users.
    const stats = getRowFor(el, 'major_group').querySelector('.annotation-stats') as HTMLElement;
    expect(stats.querySelector('.stat-direction')?.getAttribute('aria-hidden')).toBe('true');
    expect(stats.querySelector('.stat-direction')?.textContent).toBe('↓');
    expect(stats.textContent).toContain('lower is better');
  });

  it('marks higher-is-better metrics with an up arrow', async () => {
    const el = await setup({
      annotations: CUSTOM_ANNOTATIONS,
      statistics: [statRow()],
      selectedProjection: 'umap',
    });
    await openDropdown(el);

    const stats = getRowFor(el, 'major_group').querySelector('.annotation-stats') as HTMLElement;
    expect(stats.querySelector('.stat-direction')?.textContent).toBe('↑');
    expect(stats.textContent).toContain('higher is better');
  });

  it('marks rows that carry statistics with a badge and a chart icon', async () => {
    const el = await setup({
      annotations: [...CUSTOM_ANNOTATIONS, 'gene_name'],
      statistics: [statRow()],
      selectedProjection: 'umap',
    });
    await openDropdown(el);

    expect(getRowFor(el, 'major_group').querySelector('.stats-badge')?.textContent).toBe('STATS');
    expect(getRowFor(el, 'gene_name').querySelector('.stats-badge')).toBeNull();

    // `gene_name` has a description but no statistics, so its ⓘ must stay the plain info glyph.
    const withStats = getRowFor(el, 'major_group').querySelector('protspace-info-popover')!;
    const withoutStats = getRowFor(el, 'gene_name').querySelector('protspace-info-popover')!;
    expect(withStats.getAttribute('icon')).toBe('stats');
    expect(withoutStats.getAttribute('icon')).toBe('info');
  });

  it('renders a clickable ⓘ button for a stats-only annotation', async () => {
    // `major_group` ships no description and no docs URL, so the button can only come from the
    // popover's projected-content gate — the whole feature is invisible if that gate regresses.
    const el = await setup({
      annotations: CUSTOM_ANNOTATIONS,
      statistics: [statRow()],
      selectedProjection: 'umap',
    });
    await openDropdown(el);

    const pop = getRowFor(el, 'major_group').querySelector('protspace-info-popover') as HTMLElement;
    expect(pop.shadowRoot!.querySelector('.info-button')).not.toBeNull();
  });

  it('shows the stats in the opened popover', async () => {
    const el = await setup({
      annotations: CUSTOM_ANNOTATIONS,
      statistics: [statRow()],
      selectedProjection: 'umap',
    });
    await openDropdown(el);

    const pop = await openPopoverFor(el, 'major_group');
    expect(pop.shadowRoot!.querySelector('.popover')).not.toBeNull();
    const slot = pop.shadowRoot!.querySelector('slot') as HTMLSlotElement;
    const slotted = slot.assignedElements();
    expect(slotted.map((node) => node.className)).toEqual(['annotation-stats']);
    expect(slotted[0].textContent).toContain('Silhouette');
  });

  it('always states that statistics cover the full dataset', async () => {
    // Isolation, query filters, legend hides and the EAT threshold all narrow the view; the
    // scores never change. Stating the scope unconditionally cannot drift out of date.
    const el = await setup({
      annotations: CUSTOM_ANNOTATIONS,
      statistics: [statRow()],
      selectedProjection: 'umap',
    });
    await openDropdown(el);

    const stats = getRowFor(el, 'major_group').querySelector('.annotation-stats') as HTMLElement;
    expect(stats.querySelector('.stat-caveat')!.textContent).toContain(
      'Computed on the full dataset',
    );
  });

  it('states how many categories and proteins the scores cover', async () => {
    // The bundle has no per-category scores; these two counts are its only category-level facts.
    const el = await setup({
      annotations: CUSTOM_ANNOTATIONS,
      statistics: [statRow({ extra_json: '{"n_categories": 5, "n_labels": 1427}' })],
      selectedProjection: 'umap',
    });
    await openDropdown(el);

    const stats = getRowFor(el, 'major_group').querySelector('.annotation-stats') as HTMLElement;
    expect(stats.textContent).toContain('5 categories · 1,427 proteins scored');
  });

  it('widens only the popovers that carry stats', async () => {
    const el = await setup({
      annotations: [...CUSTOM_ANNOTATIONS, 'gene_name'],
      statistics: [statRow()],
      selectedProjection: 'umap',
    });
    await openDropdown(el);

    // `gene_name` has a built-in description but no statistics — it must keep the default width.
    expect(
      getRowFor(el, 'gene_name').querySelector('protspace-info-popover')!.classList,
    ).not.toContain('has-stats');
    expect(
      getRowFor(el, 'major_group').querySelector('protspace-info-popover')!.classList,
    ).toContain('has-stats');
  });

  it('marks an absent embedding ceiling so its column can collapse', async () => {
    const el = await setup({
      annotations: CUSTOM_ANNOTATIONS,
      statistics: [
        statRow(),
        statRow({ space_kind: 'embedding', space_name: 'prot_t5', value: 0.1 }),
        statRow({
          stat_family: 'cluster_agreement',
          label_kind: 'kmeans_elbow',
          metric: 'adjusted_rand',
          metric_kind: 'agreement',
          value: 0.5,
        }),
      ],
      selectedProjection: 'umap',
    });
    await openDropdown(el);

    const cells = Array.from(
      getRowFor(el, 'major_group').querySelectorAll('.stat-metric-embedding'),
    );
    // Silhouette has a ceiling; the agreement metric never does.
    expect(cells.map((cell) => cell.classList.contains('is-empty'))).toEqual([false, true]);
  });

  it('does not rebuild the list when the pointer crosses a row', async () => {
    const el = await setup({
      annotations: CUSTOM_ANNOTATIONS,
      statistics: [statRow()],
      selectedProjection: 'umap',
    });
    await openDropdown(el);

    // Node-identity alone passes vacuously: lit's keyless `.map()` diffing reuses each row's DOM
    // node in place regardless of whether the handler runs. Watch for any DOM mutation instead —
    // hovering is presentation (CSS `:hover`) and must not touch the DOM at all.
    const container = el.shadowRoot!.querySelector('.annotation-list-container') as HTMLElement;
    const records: MutationRecord[] = [];
    const observer = new MutationObserver((mutations) => records.push(...mutations));
    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });

    getRowFor(el, 'seq_start').dispatchEvent(new MouseEvent('mouseenter'));
    await el.updateComplete;
    records.push(...observer.takeRecords());
    observer.disconnect();

    expect(records).toHaveLength(0);
  });
});

interface ControlBarInternals extends HTMLElement {
  annotations: string[];
  _filterableAnnotations: string[];
  selectedAnnotation: string;
  _updateOptionsFromData(data: ProtspaceData, capabilityData?: ProtspaceData): void;
  updateComplete: Promise<unknown>;
}

describe('protspace-control-bar annotation list splitting', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('excludes eat-confidence annotations from the color-by list but keeps them in the filterable list', async () => {
    const controlBar = document.createElement('protspace-control-bar') as ControlBarInternals;
    document.body.appendChild(controlBar);
    await controlBar.updateComplete;

    const data: ProtspaceData = {
      projections: [{ name: 'umap' }],
      annotations: {
        pfam: { kind: 'categorical', values: ['a', 'b'] },
        pfam__eat_confidence: {
          kind: 'numeric',
          values: ['0.9', '0.4'],
          runtime: { role: 'eat-confidence', baseAnnotation: 'pfam' },
        },
        // Collision-renamed variant (real allocateEatConfidenceAnnotationKey output shape:
        // `<base>__eat_confidence__runtime_N`) — identity must still key off runtime.role,
        // not the `__eat_confidence` suffix.
        pfam__eat_confidence__runtime_2: {
          kind: 'numeric',
          values: ['0.1', '0.7'],
          runtime: { role: 'eat-confidence', baseAnnotation: 'pfam' },
        },
      },
    };

    controlBar._updateOptionsFromData(data);

    expect(controlBar.annotations).toEqual(['pfam']);
    expect(controlBar._filterableAnnotations).toEqual([
      'pfam',
      'pfam__eat_confidence',
      'pfam__eat_confidence__runtime_2',
    ]);
    // The default color-by selection must never land on an eat-confidence key.
    expect(controlBar.selectedAnnotation).toBe('pfam');
  });
});
