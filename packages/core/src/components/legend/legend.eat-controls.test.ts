// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { VisualizationData } from '@protspace/utils';
import './legend';
import { mountLegendWithScatterplot } from './test-support/legend-scatterplot-harness';

function makeData(): VisualizationData {
  return {
    protein_ids: ['observed', 'predicted', 'missing'],
    projections: [{ name: 'pca', dimension: 2, data: new Float32Array(6) }],
    annotations: {
      ec: {
        kind: 'categorical',
        values: ['observed', 'predicted', '__NA__'],
        colors: ['#111', '#555', '#ccc'],
        shapes: ['circle', 'circle', 'circle'],
      },
      family: {
        kind: 'categorical',
        values: ['family'],
        colors: ['#111'],
        shapes: ['circle'],
      },
    },
    annotation_data: {
      ec: new Int32Array([0, 2, 2]),
      family: new Int32Array([0, 0, 0]),
    },
    annotation_predicted: {
      ec: [null, { value: 'predicted', confidence: 0.8, source: 'observed' }, null],
    },
  };
}

async function setup() {
  const data = makeData();
  const { legend, plot } = await mountLegendWithScatterplot(data, 'ec');
  return { data, legend, plot };
}

describe('legend-owned EAT controls', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('renders the controls with counts', async () => {
    const { legend } = await setup();
    const root = legend.shadowRoot!;
    const group = root.querySelector<HTMLElement>('.eat-legend')!;

    expect(group.getAttribute('aria-label')).toBe('Embedding Annotation Transfer');
    expect(group.textContent).toContain('Predicted (transferred)');
    expect(group.textContent).toContain('Observed');
    expect(group.textContent).toContain('Predicted by EAT');
    // Default reliability position is 0 (show everything, clean filter box).
    expect(root.querySelector<HTMLInputElement>('.eat-threshold-percent')?.value).toBe('0');
  });

  it('syncs the overlay switch with the scatter plot and emits threshold changes for the filter', async () => {
    const { legend, plot } = await setup();
    const listener = vi.fn();
    legend.addEventListener('eat-overlay-change', listener);

    const toggle = legend.shadowRoot!.querySelector<HTMLInputElement>('.eat-switch input')!;
    toggle.checked = false;
    toggle.dispatchEvent(new Event('change'));
    await legend.updateComplete;

    // The overlay switch still coalesces predictions on the scatter plot.
    expect(plot.eatOverlayEnabled).toBe(false);
    expect(legend.shadowRoot!.querySelector('.eat-legend')).not.toBeNull();
    expect(legend.shadowRoot!.querySelector('.eat-legend-counts')).toBeNull();
    expect(
      legend.shadowRoot!.querySelector<HTMLInputElement>('.eat-threshold input')?.disabled,
    ).toBe(true);

    toggle.checked = true;
    toggle.dispatchEvent(new Event('change'));
    const range = legend.shadowRoot!.querySelector<HTMLInputElement>(
      '.eat-threshold input[type="range"]',
    )!;
    range.value = '0.73';
    range.dispatchEvent(new Event('input'));
    // Releasing the slider flushes the debounced apply so the emit lands now.
    range.dispatchEvent(new Event('change'));
    await legend.updateComplete;

    expect(plot.eatOverlayEnabled).toBe(true);
    // The threshold is no longer pushed onto the scatter plot as a dimming input;
    // it rides the eat-overlay-change contract and the range/percent stay in sync.
    expect(plot).not.toHaveProperty('eatConfidenceThreshold');
    expect(
      legend.shadowRoot!.querySelector<HTMLInputElement>('.eat-threshold-percent')?.value,
    ).toBe('73');
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({ enabled: true, confidenceThreshold: 0.73 }),
      }),
    );

    const percent = legend.shadowRoot!.querySelector<HTMLInputElement>('.eat-threshold-percent')!;
    percent.value = '34';
    percent.dispatchEvent(new Event('input'));
    percent.dispatchEvent(new Event('change'));
    await legend.updateComplete;
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({ enabled: true, confidenceThreshold: 0.34 }),
      }),
    );
    expect(range.value).toBe('0.34');
  });

  it('debounces the threshold apply: display stays live, the emit defers ~150ms', async () => {
    const { legend } = await setup();
    vi.useFakeTimers();
    const listener = vi.fn();
    legend.addEventListener('eat-overlay-change', listener);

    const range = legend.shadowRoot!.querySelector<HTMLInputElement>(
      '.eat-threshold input[type="range"]',
    )!;
    range.value = '0.62';
    range.dispatchEvent(new Event('input'));

    // The slider thumb value + percent readout update immediately for a smooth drag.
    expect(legend.reliabilityThreshold).toBe(0.62);
    await legend.updateComplete;
    expect(
      legend.shadowRoot!.querySelector<HTMLInputElement>('.eat-threshold-percent')?.value,
    ).toBe('62');

    // ...but the expensive downstream apply (the emit that re-runs the query) waits.
    expect(listener).not.toHaveBeenCalled();

    vi.advanceTimersByTime(150);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({ enabled: true, confidenceThreshold: 0.62 }),
      }),
    );
  });

  it('collapses a rapid drag into a single deferred emit', async () => {
    const { legend } = await setup();
    vi.useFakeTimers();
    const listener = vi.fn();
    legend.addEventListener('eat-overlay-change', listener);

    const range = legend.shadowRoot!.querySelector<HTMLInputElement>(
      '.eat-threshold input[type="range"]',
    )!;
    for (const v of ['0.1', '0.2', '0.3', '0.45']) {
      range.value = v;
      range.dispatchEvent(new Event('input'));
    }
    expect(listener).not.toHaveBeenCalled();

    vi.advanceTimersByTime(150);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({ enabled: true, confidenceThreshold: 0.45 }),
      }),
    );
  });

  it('flushes the pending apply immediately on slider release (@change)', async () => {
    const { legend } = await setup();
    vi.useFakeTimers();
    const listener = vi.fn();
    legend.addEventListener('eat-overlay-change', listener);

    const range = legend.shadowRoot!.querySelector<HTMLInputElement>(
      '.eat-threshold input[type="range"]',
    )!;
    range.value = '0.4';
    range.dispatchEvent(new Event('input'));
    expect(listener).not.toHaveBeenCalled();

    // Release commits without waiting out the full debounce window.
    range.dispatchEvent(new Event('change'));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({ enabled: true, confidenceThreshold: 0.4 }),
      }),
    );

    // The already-flushed timer must not fire a duplicate emit.
    vi.advanceTimersByTime(150);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('applies the overlay toggle immediately (no debounce)', async () => {
    const { legend } = await setup();
    vi.useFakeTimers();
    const listener = vi.fn();
    legend.addEventListener('eat-overlay-change', listener);

    const toggle = legend.shadowRoot!.querySelector<HTMLInputElement>('.eat-switch input')!;
    toggle.checked = false;
    toggle.dispatchEvent(new Event('change'));

    // The toggle is a discrete action, not a drag — it emits synchronously.
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({ enabled: false, confidenceThreshold: 0 }),
      }),
    );
  });

  it('cancels a pending threshold commit when the overlay toggle supersedes it', async () => {
    const { legend } = await setup();
    vi.useFakeTimers();
    const listener = vi.fn();
    legend.addEventListener('eat-overlay-change', listener);

    // Arm the debounce with a drag tick...
    const range = legend.shadowRoot!.querySelector<HTMLInputElement>(
      '.eat-threshold input[type="range"]',
    )!;
    range.value = '0.55';
    range.dispatchEvent(new Event('input'));

    // ...then a discrete toggle applies immediately (one emit) and supersedes it.
    const toggle = legend.shadowRoot!.querySelector<HTMLInputElement>('.eat-switch input')!;
    toggle.checked = false;
    toggle.dispatchEvent(new Event('change'));
    expect(listener).toHaveBeenCalledTimes(1);

    // The superseded debounce timer must not fire a stale second emit.
    vi.advanceTimersByTime(150);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('cancels a pending threshold commit on disconnect (teardown)', async () => {
    const { legend } = await setup();
    vi.useFakeTimers();
    const listener = vi.fn();
    legend.addEventListener('eat-overlay-change', listener);

    const range = legend.shadowRoot!.querySelector<HTMLInputElement>(
      '.eat-threshold input[type="range"]',
    )!;
    range.value = '0.55';
    range.dispatchEvent(new Event('input'));
    expect(listener).not.toHaveBeenCalled();

    // Tearing the element down clears the pending timer — no emit after teardown.
    legend.remove();
    vi.advanceTimersByTime(150);
    expect(listener).not.toHaveBeenCalled();
  });

  it('setReliabilityThreshold updates the slider without re-emitting (reverse mirror)', async () => {
    const { legend } = await setup();
    const listener = vi.fn();
    legend.addEventListener('eat-overlay-change', listener);

    legend.setReliabilityThreshold(0.42);
    await legend.updateComplete;

    expect(legend.reliabilityThreshold).toBe(0.42);
    expect(
      legend.shadowRoot!.querySelector<HTMLInputElement>('.eat-threshold-percent')?.value,
    ).toBe('42');
    // Reverse direction must stay silent so it can't loop back to the control bar.
    expect(listener).not.toHaveBeenCalled();
  });

  it('uses stable dataset capability and omits controls for a non-EAT selection', async () => {
    const { data, legend, plot } = await setup();
    const filteredView = {
      ...data,
      protein_ids: ['observed'],
      annotation_data: {
        ec: new Int32Array([0]),
        family: new Int32Array([0]),
      },
      annotation_predicted: { ec: [null] },
    };
    plot.getCurrentData = () => filteredView;
    plot.dispatchEvent(new CustomEvent('data-change', { detail: { data: filteredView } }));
    await legend.updateComplete;
    expect(legend.shadowRoot!.querySelector('.eat-legend')).not.toBeNull();

    plot.selectedAnnotation = 'family';
    legend.selectedAnnotation = 'family';
    legend.requestUpdate();
    await legend.updateComplete;
    expect(legend.shadowRoot!.querySelector('.eat-legend')).toBeNull();
  });
});

/**
 * #380 — the legend must be able to express the three filter directions the issue
 * names, not just "hide below". Each mode emits the full state so the control bar
 * can translate it into one un-negated condition carrying the N/A presence chip,
 * which is what keeps curated points visible.
 */
describe('legend EAT reliability modes (#380)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  async function selectMode(mode: 'atLeast' | 'atMost' | 'between') {
    const { legend } = await setup();
    const listener = vi.fn();
    legend.addEventListener('eat-overlay-change', listener);
    const select = legend.shadowRoot!.querySelector<HTMLSelectElement>('.eat-threshold-mode')!;
    select.value = mode;
    select.dispatchEvent(new Event('change'));
    await legend.updateComplete;
    return { legend, listener };
  }

  it('offers all three directions', async () => {
    const { legend } = await setup();
    const options = Array.from(
      legend.shadowRoot!.querySelectorAll<HTMLOptionElement>('.eat-threshold-mode option'),
    ).map((o) => o.value);
    expect(options).toEqual(['atLeast', 'atMost', 'between']);
  });

  it('emits the mode immediately, without waiting out the drag debounce', async () => {
    const { listener } = await selectMode('atMost');
    expect(listener).toHaveBeenCalled();
    expect(listener.mock.lastCall?.[0].detail.reliability.mode).toBe('atMost');
  });

  it('reveals a second bound only for a band', async () => {
    const { legend } = await selectMode('between');
    expect(legend.shadowRoot!.querySelector('#eat-reliability-upper')).not.toBeNull();

    const { legend: atLeast } = await selectMode('atLeast');
    expect(atLeast.shadowRoot!.querySelector('#eat-reliability-upper')).toBeNull();
  });

  it('clears the bound a mode no longer uses, so no invisible constraint survives', async () => {
    const { legend } = await setup();
    legend.setReliabilityState({ mode: 'between', min: 0.2, max: 0.6 });
    await legend.updateComplete;

    const select = legend.shadowRoot!.querySelector<HTMLSelectElement>('.eat-threshold-mode')!;
    select.value = 'atLeast';
    select.dispatchEvent(new Event('change'));
    await legend.updateComplete;

    // The upper bound is no longer editable, so it must not still be filtering.
    expect(legend.reliabilityState.max).toBe(1);
  });

  it('round-trips the full state through the reverse mirror', async () => {
    const { legend } = await setup();
    legend.setReliabilityState({ mode: 'between', min: 0.25, max: 0.75 });
    await legend.updateComplete;
    expect(legend.reliabilityState).toEqual({ mode: 'between', min: 0.25, max: 0.75 });
  });
});
