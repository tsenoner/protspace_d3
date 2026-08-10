import { test } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import {
  TEMP_VIDEOS_DIR,
  initVisualIndicators,
  logAction,
  printActionSummary,
  showActionLabel,
  showClickIndicator,
  trackedMouseClick,
  trackedMouseMove,
} from './helpers';
import {
  DEMO_ANNOTATION,
  getProteinScreenPosition,
  loadVenomEatBundle,
  pickProvenanceDemoPair,
  selectAnnotation,
} from './eat-helpers';

/**
 * Animated captures for `docs/explore/eat.md`.
 *
 * Matches the conventions of `capture-animations.spec.ts`: an INITIAL_PAUSE at
 * the top of each test that `convert-to-gif.ts` trims away, visual click
 * indicators so the viewer can see where the pointer acted, and the video
 * saved under a name derived from the test title.
 */

const INITIAL_PAUSE = 2000;
const BEAT = 1200;

test.beforeAll(async () => {
  if (!fs.existsSync(TEMP_VIDEOS_DIR)) {
    fs.mkdirSync(TEMP_VIDEOS_DIR, { recursive: true });
  }
});

test.beforeEach(async ({ page }) => {
  await loadVenomEatBundle(page);
  await selectAnnotation(page, DEMO_ANNOTATION);
  await initVisualIndicators(page);
});

test.afterEach(async ({ page }, testInfo) => {
  printActionSummary();

  const video = page.video();
  if (!video) return;

  const sanitizedName = testInfo.title
    .replace(/\.gif.*$/, '')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .toLowerCase();

  // Close the page first so the recording is finalized before saveAs().
  await page.close();
  const destPath = path.join(TEMP_VIDEOS_DIR, `${sanitizedName}.webm`);
  await video.saveAs(destPath);
  console.log(`🎬 Video saved: ${destPath}`);
});

test('eat-connectors.gif - Tracing where a transferred value came from', async ({ page }) => {
  const { source, target, dependantCount } = await pickProvenanceDemoPair(page, DEMO_ANNOTATION);
  await logAction(
    page,
    'mouse',
    'Provenance pair',
    `${target} borrowed from ${source} (${dependantCount} dependants)`,
  );

  const targetPos = await getProteinScreenPosition(page, target);
  const sourcePos = await getProteinScreenPosition(page, source);

  // Settle on the plot before the first action; this stretch is trimmed.
  await trackedMouseMove(page, targetPos.x, targetPos.y, { steps: 15 });
  await page.waitForTimeout(INITIAL_PAUSE);

  // One transferred protein: a single dashed line back to its source.
  await showActionLabel(page, 'Click a transferred protein', targetPos.x, targetPos.y);
  await showClickIndicator(page, targetPos.x, targetPos.y);
  await trackedMouseClick(page, targetPos.x, targetPos.y);
  await page
    .locator('protspace-scatterplot')
    .locator('line.eat-provenance-connector')
    .first()
    .waitFor({ state: 'visible' });
  await page.waitForTimeout(BEAT * 2);

  // The source it borrowed from: lines fan out to everything that used it.
  await trackedMouseMove(page, sourcePos.x, sourcePos.y, { steps: 15 });
  await showActionLabel(page, 'Click its source', sourcePos.x, sourcePos.y);
  await showClickIndicator(page, sourcePos.x, sourcePos.y);
  await trackedMouseClick(page, sourcePos.x, sourcePos.y);
  await page.waitForTimeout(BEAT * 2);

  // Escape clears the connectors without clearing the selection.
  await showActionLabel(page, 'Esc to clear', sourcePos.x, sourcePos.y);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(BEAT);
});

test('eat-reliability.gif - Hiding predictions below a reliability threshold', async ({ page }) => {
  const eatGroup = page
    .locator('protspace-legend')
    .getByRole('region', { name: 'Embedding Annotation Transfer' });
  const thresholdPercent = eatGroup.getByRole('spinbutton', {
    name: 'EAT reliability filter percentage',
  });

  await eatGroup.waitFor({ state: 'visible' });
  const box = await eatGroup.boundingBox();
  if (!box) throw new Error('Could not get the EAT legend group bounding box');

  // Park the pointer beside the control being driven; this stretch is trimmed.
  await trackedMouseMove(page, box.x + box.width / 2, box.y + box.height / 2, { steps: 15 });
  await page.waitForTimeout(INITIAL_PAUSE);

  // Step the threshold up so the rings thin out in visible stages rather than
  // snapping straight to the final state.
  for (const percent of ['40', '70', '90']) {
    await showActionLabel(
      page,
      `Hide below ${percent}%`,
      box.x + box.width / 2,
      box.y + box.height / 2,
    );
    await thresholdPercent.fill(percent);
    await thresholdPercent.press('Enter');
    await logAction(page, 'keyboard', 'Reliability threshold', `${percent}%`);
    await page.waitForTimeout(BEAT);
  }

  await page.waitForTimeout(BEAT);

  // Back to 0: every prediction returns and the filter condition is removed.
  await showActionLabel(page, 'Back to 0%', box.x + box.width / 2, box.y + box.height / 2);
  await thresholdPercent.fill('0');
  await thresholdPercent.press('Enter');
  await logAction(page, 'keyboard', 'Reliability threshold', '0%');
  await page.waitForTimeout(BEAT * 2);
});
