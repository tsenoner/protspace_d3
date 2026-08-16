import { expect, test, type Page } from '@playwright/test';
import { dismissTourIfPresent, waitForExploreDataLoad } from './helpers/explore';

/**
 * Camera motion must not touch the GPU's buffers.
 *
 * This is the #456 fix stated directly, and it is deliberately a *byte* count
 * rather than a wall-clock threshold: the issue's own numbers are one machine and
 * one session, whereas "a pan uploaded zero bytes" is machine-independent, needs
 * no GPU (SwiftShader is fine) and needs no new fixture.
 *
 * It is also immune to the obvious way of faking the fix — a cache in front of
 * the cull would still re-materialise on a miss, and every gesture misses,
 * because the memo key rounds the transform to whole pixels and three decimal
 * places of scale.
 *
 * Honest scope: on the shipped demo dataset (~7.8K proteins) this assertion also
 * passes on `main`, because the cull never engaged below 1,000,000 points. So it
 * is a guardrail against reintroduction, not a proof of the fix. The proof at
 * >= 1M is `scatter-plot.render-path.test.ts`, which is red on the parent commit.
 */

interface PlotInternals extends Element {
  data?: { protein_ids?: string[] };
  _webglRenderer?: { uploadedBytesTotal: number; drawnPointCount: number };
  _interaction?: {
    isZoomReady: boolean;
    zoomBy(factor: number): void;
    panBy(dx: number, dy: number): void;
  };
}

async function rendererStats(page: Page) {
  return page.evaluate(() => {
    const plot = document.querySelector('#myPlot') as PlotInternals | null;
    return {
      uploadedBytes: plot?._webglRenderer?.uploadedBytesTotal ?? -1,
      drawnPoints: plot?._webglRenderer?.drawnPointCount ?? -1,
      proteinCount: plot?.data?.protein_ids?.length ?? -1,
      zoomReady: plot?._interaction?.isZoomReady ?? false,
    };
  });
}

/** Apply a gesture through the real interaction path and wait for the render. */
async function gesture(page: Page, kind: 'zoom' | 'pan'): Promise<void> {
  await page.evaluate((which) => {
    const plot = document.querySelector('#myPlot') as PlotInternals | null;
    if (which === 'zoom') plot?._interaction?.zoomBy(3);
    else plot?._interaction?.panBy(160, 96);
  }, kind);
  // Two frames: one for the transform to land, one for the render it triggers.
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
}

test.describe('camera motion does not rebuild GPU buffers', () => {
  test('a zoom and a pan upload zero bytes', async ({ page }) => {
    await page.goto('/explore');
    await dismissTourIfPresent(page);
    await waitForExploreDataLoad(page);

    const initial = await rendererStats(page);
    expect(initial.uploadedBytes, 'renderer internals not reachable').toBeGreaterThan(0);
    expect(initial.zoomReady, 'interaction layer never initialised').toBe(true);

    await gesture(page, 'zoom');
    const afterZoom = await rendererStats(page);
    expect(
      afterZoom.uploadedBytes - initial.uploadedBytes,
      'a zoom uploaded bytes to the GPU',
    ).toBe(0);

    await gesture(page, 'pan');
    const afterPan = await rendererStats(page);
    expect(
      afterPan.uploadedBytes - afterZoom.uploadedBytes,
      'a pan uploaded bytes to the GPU',
    ).toBe(0);

    // Zooming back out likewise: the point is that no camera state restages.
    await gesture(page, 'zoom');
    const afterSecondZoom = await rendererStats(page);
    expect(afterSecondZoom.uploadedBytes - afterPan.uploadedBytes).toBe(0);
  });

  test('every protein the loader admitted is actually drawn', async ({ page }) => {
    await page.goto('/explore');
    await dismissTourIfPresent(page);
    await waitForExploreDataLoad(page);

    const stats = await rendererStats(page);
    expect(stats.proteinCount).toBeGreaterThan(0);
    // The renderer used to report the full count while drawing at most 1,000,000
    // of them, cut by array position, with nothing in the UI saying so.
    expect(stats.drawnPoints).toBe(stats.proteinCount);
  });

  test('a real styling change still restages', async ({ page }) => {
    // The guardrail must not be satisfiable by a renderer that has stopped
    // uploading altogether.
    await page.goto('/explore');
    await dismissTourIfPresent(page);
    await waitForExploreDataLoad(page);

    const before = await rendererStats(page);
    await page.goto('/explore?annotation=cath');
    await dismissTourIfPresent(page);
    await waitForExploreDataLoad(page);
    const after = await rendererStats(page);

    expect(after.uploadedBytes).toBeGreaterThan(0);
    expect(after.uploadedBytes).not.toBe(before.uploadedBytes);
  });
});
