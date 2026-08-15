import { expect, test, type Page } from '@playwright/test';
import { dismissTourIfPresent, waitForExploreDataLoad } from './helpers/explore';

/**
 * The label atlas against a device whose texture limit it cannot fit.
 *
 * jsdom has no WebGL, so this is the only layer that exercises the real
 * renderer. But a limit *stub* alone proves nothing: `gl.MAX_TEXTURE_SIZE` only
 * changes what the app believes, while the actual driver on this machine happily
 * accepts the allocation. So the driver's refusal is simulated too —
 * `texImage2D` past the simulated limit does not call through and arms
 * `getError`, exactly as a real driver does: no exception, no unwinding, the
 * texture left unallocated.
 *
 * That simulation is what makes the assertion meaningful. The reported failure
 * is silent — nothing in the app called `gl.getError()` — so "no console errors"
 * would pass on the broken code too. What the test asserts instead is that the
 * renderer never *issues* an allocation the device would refuse.
 *
 * The demo dataset is ~7.8K proteins, so its atlas is 2048x31 — no realistic
 * limit forces a stride reduction at that size. This spec therefore covers the
 * "no atlas fits at all" path; the reduced-stride path needs the 573K fixture
 * and lives in load-large-bundle.spec.ts.
 */

interface SimulatedGlStats {
  refusedAllocations: Array<[number, number]>;
  refusedUpdates: number;
}

declare global {
  interface Window {
    __glSim?: SimulatedGlStats;
  }
}

/**
 * Simulate a WebGL2 device whose `MAX_TEXTURE_SIZE` is `limit`, including the
 * driver-side refusal of anything larger.
 */
async function simulateTextureLimit(page: Page, limit: number): Promise<void> {
  await page.addInitScript((maxTextureSize: number) => {
    const MAX_TEXTURE_SIZE = 0x0d33;
    const INVALID_VALUE = 0x0501;
    const INVALID_OPERATION = 0x0502;

    const stats: SimulatedGlStats = { refusedAllocations: [], refusedUpdates: 0 };
    window.__glSim = stats;

    const proto = WebGL2RenderingContext.prototype;
    const originalGetParameter = proto.getParameter;
    const originalTexImage2D = proto.texImage2D;
    const originalTexSubImage2D = proto.texSubImage2D;
    const originalGetError = proto.getError;
    const originalBindTexture = proto.bindTexture;

    const boundTexture = new WeakMap<WebGL2RenderingContext, WebGLTexture | null>();
    const allocated = new WeakSet<WebGLTexture>();
    const pendingError = new WeakMap<WebGL2RenderingContext, number>();

    proto.getParameter = function patchedGetParameter(this: WebGL2RenderingContext, name: number) {
      if (name === MAX_TEXTURE_SIZE) return maxTextureSize;
      return originalGetParameter.call(this, name);
    };

    proto.bindTexture = function patchedBindTexture(
      this: WebGL2RenderingContext,
      target: number,
      texture: WebGLTexture | null,
    ) {
      boundTexture.set(this, texture);
      return originalBindTexture.call(this, target, texture);
    };

    proto.texImage2D = function patchedTexImage2D(
      this: WebGL2RenderingContext,
      ...args: unknown[]
    ) {
      const width = args[3] as number;
      const height = args[4] as number;
      const texture = boundTexture.get(this) ?? null;

      if (
        typeof width === 'number' &&
        typeof height === 'number' &&
        (width > maxTextureSize || height > maxTextureSize)
      ) {
        // A real driver raises GL_INVALID_VALUE here: no exception, nothing
        // unwinds, and the texture is left without storage.
        stats.refusedAllocations.push([width, height]);
        pendingError.set(this, INVALID_VALUE);
        if (texture) allocated.delete(texture);
        return undefined;
      }

      if (texture) allocated.add(texture);
      return (originalTexImage2D as (...a: unknown[]) => unknown).apply(this, args);
    };

    proto.texSubImage2D = function patchedTexSubImage2D(
      this: WebGL2RenderingContext,
      ...args: unknown[]
    ) {
      const texture = boundTexture.get(this) ?? null;
      if (texture && !allocated.has(texture)) {
        // Updating a texture that was never allocated: GL_INVALID_OPERATION,
        // forever, which is the permanent half of the reported failure.
        stats.refusedUpdates += 1;
        pendingError.set(this, INVALID_OPERATION);
        return undefined;
      }
      return (originalTexSubImage2D as (...a: unknown[]) => unknown).apply(this, args);
    };

    proto.getError = function patchedGetError(this: WebGL2RenderingContext) {
      const simulated = pendingError.get(this);
      if (simulated !== undefined) {
        pendingError.delete(this); // getError clears the flag it reports
        return simulated;
      }
      return originalGetError.call(this);
    };
  }, limit);
}

async function simulatedGlStats(page: Page): Promise<SimulatedGlStats> {
  return page.evaluate(() => window.__glSim ?? { refusedAllocations: [], refusedUpdates: 0 });
}

/** Distinct opaque colours present in the plot canvas, as "r,g,b" keys. */
async function distinctCanvasColors(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const canvas = document
      .querySelector('#myPlot')
      ?.shadowRoot?.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) return [];
    const copy = document.createElement('canvas');
    copy.width = canvas.width;
    copy.height = canvas.height;
    const ctx = copy.getContext('2d');
    if (!ctx) return [];
    ctx.drawImage(canvas, 0, 0);
    const { data } = ctx.getImageData(0, 0, copy.width, copy.height);
    const seen = new Set<string>();
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 200) continue; // skip background and anti-alias fringe
      seen.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
    }
    return [...seen];
  });
}

// A multi-value annotation in the shipped demo dataset, so the atlas is actually
// in play. `cath` and `superfamily` are the others.
const MULTI_VALUE_ANNOTATION = 'keyword';

test.describe('label atlas on a device that cannot hold it', () => {
  test('never issues an allocation the device would refuse', async ({ page }) => {
    // 1024 is below the narrowest atlas width, so no layout fits and the
    // renderer must allocate none. The broken code ignored the limit entirely
    // and issued 2048 x 31, which this simulated driver refuses.
    await simulateTextureLimit(page, 1024);

    await page.goto(`/explore?annotation=${MULTI_VALUE_ANNOTATION}`);
    await dismissTourIfPresent(page);
    await waitForExploreDataLoad(page);

    const stats = await simulatedGlStats(page);
    expect(
      stats.refusedAllocations,
      `renderer issued texture allocations the device refuses: ${JSON.stringify(stats.refusedAllocations)}`,
    ).toEqual([]);
    // The permanent half: once an allocation is refused, every later update
    // targets storage that does not exist.
    expect(stats.refusedUpdates).toBe(0);
  });

  test('still draws every point, in colour rather than black', async ({ page }) => {
    await simulateTextureLimit(page, 1024);

    await page.goto(`/explore?annotation=${MULTI_VALUE_ANNOTATION}`);
    await dismissTourIfPresent(page);
    await waitForExploreDataLoad(page);

    const proteinCount = await page.evaluate(() => {
      const plot = document.querySelector('#myPlot') as
        | (Element & { data?: { protein_ids?: { length?: number } } })
        | null;
      return plot?.data?.protein_ids?.length ?? 0;
    });
    expect(proteinCount).toBeGreaterThan(0);

    // Fidelity degrades; coverage does not. Markers fall back to their dominant
    // colour, which is what the legend shows — never the solid black an
    // unallocated atlas produced.
    const colors = await distinctCanvasColors(page);
    expect(colors.length).toBeGreaterThan(1);
    expect(colors.every((c) => c === '0,0,0')).toBe(false);
  });

  test('tells the user that marker fidelity was reduced', async ({ page }) => {
    await simulateTextureLimit(page, 1024);

    await page.goto(`/explore?annotation=${MULTI_VALUE_ANNOTATION}`);
    await dismissTourIfPresent(page);
    await waitForExploreDataLoad(page);

    await expect(page.getByText('Rendering quality reduced.')).toBeVisible({ timeout: 15_000 });
  });

  test('is inert on a device with ample limits', async ({ page }) => {
    // Same simulation, a limit nothing reaches: the atlas allocates normally and
    // no refusal is recorded, so the simulation itself cannot be what fails the
    // tests above.
    await simulateTextureLimit(page, 8192);

    await page.goto(`/explore?annotation=${MULTI_VALUE_ANNOTATION}`);
    await dismissTourIfPresent(page);
    await waitForExploreDataLoad(page);

    const stats = await simulatedGlStats(page);
    expect(stats.refusedAllocations).toEqual([]);
    expect(stats.refusedUpdates).toBe(0);
    await expect(page.getByText('Rendering quality reduced.')).toHaveCount(0);
  });
});
