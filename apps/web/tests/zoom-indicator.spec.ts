import { expect, test } from '@playwright/test';
import { waitForExploreDataLoad, waitForExploreInteractionReady } from './helpers/explore';

test.describe('scatterplot zoom indicator (#343)', () => {
  test('shows after wheel zoom and disappears after double-click reset', async ({ page }) => {
    await page.goto('/explore');
    await waitForExploreDataLoad(page);
    await waitForExploreInteractionReady(page);

    const plot = page.locator('#myPlot');
    const bounds = await plot.boundingBox();
    expect(bounds).not.toBeNull();

    const center = {
      x: bounds!.x + bounds!.width / 2,
      y: bounds!.y + bounds!.height / 2,
    };
    const pointCount = plot.locator('.point-count');
    const pointCountChip = pointCount.locator('..');
    const zoomMarker = pointCountChip.locator('.zoom-indicator');
    await expect(zoomMarker).toHaveCount(0);

    await page.mouse.move(center.x, center.y);
    await page.mouse.wheel(0, -500);
    await expect
      .poll(() => plot.evaluate((element: any) => element._transform.k))
      .toBeGreaterThan(1);
    await expect(pointCount).toHaveText(/^\d+ points$/);
    await expect(zoomMarker).toHaveText('· Zoomed in');
    const chipSpacing = await pointCountChip.evaluate((chip) => {
      const count = chip.querySelector('.point-count')?.getBoundingClientRect();
      const marker = chip.querySelector('.zoom-indicator')?.getBoundingClientRect();
      return {
        actual: count && marker ? marker.left - count.right : 0,
        configured: Number.parseFloat(getComputedStyle(chip).columnGap),
      };
    });
    expect(chipSpacing.actual).toBeGreaterThan(0);
    expect(chipSpacing.actual).toBeCloseTo(chipSpacing.configured, 1);

    await page.mouse.dblclick(center.x, center.y);
    await expect.poll(() => plot.evaluate((element: any) => element._transform.k)).toBe(1);
    await expect(zoomMarker).toHaveCount(0);
  });
});
