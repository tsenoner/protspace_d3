import { type Page } from '@playwright/test';
import * as path from 'path';

/**
 * Shared setup for the EAT documentation captures.
 *
 * Every other capture in this folder runs against the app's built-in demo
 * dataset, which carries no transferred annotations. EAT needs a bundle that
 * actually has `*__pred_*` columns, so these captures load the shipped venom
 * bundle by hand: 811 proteins, `ec` with 384 transferred values and
 * `protein_families` with 14, plus a statistics part.
 */
export const VENOM_EAT_BUNDLE = path.join(
  __dirname,
  '../../apps/web/public/data/venom_eat_stats.parquetbundle',
);

/** Protein count in the venom bundle; the load gate waits for exactly this. */
const VENOM_PROTEIN_COUNT = 811;

/** The annotation the captures colour by. Highest transfer coverage in the bundle. */
export const DEMO_ANNOTATION = 'ec';

/**
 * Load the venom EAT bundle through the real file input.
 *
 * The default dataset fetch is aborted first: letting it resolve would render
 * one dataset, then swap to another mid-capture, and the video would show the
 * transition. Aborting keeps the drop zone empty until we feed it the bundle.
 */
export async function loadVenomEatBundle(page: Page): Promise<void> {
  await page.route('**/data.parquetbundle', (route) => route.abort());
  await page.goto('/explore');
  await page.evaluate(() => localStorage.setItem('driver.overviewTour', 'true'));

  await page.waitForFunction(() => {
    const loader = document.querySelector('protspace-data-loader') as
      | (Element & { loadFromFile?: (file: File) => Promise<void> })
      | null;
    return typeof loader?.loadFromFile === 'function';
  });

  await page.locator('protspace-data-loader input[type="file"]').setInputFiles(VENOM_EAT_BUNDLE);

  // `_plotData` is a struct of typed arrays with its own `length`, not an Array,
  // so probe the property rather than reaching for `Array.isArray`.
  await page.waitForFunction(
    (expected) => {
      const plot = document.querySelector('protspace-scatterplot') as
        | (Element & {
            data?: { protein_ids?: string[] };
            _plotData?: { length?: number };
            _scales?: unknown;
          })
        | null;
      if (plot?.data?.protein_ids?.length !== expected) return false;
      return (plot._plotData?.length ?? 0) > 0 && !!plot._scales;
    },
    VENOM_PROTEIN_COUNT,
    { timeout: 30000, polling: 200 },
  );

  await page.waitForFunction(() => !document.getElementById('progressive-loading'), {
    timeout: 30000,
    polling: 100,
  });
}

/** Pick an annotation from the control bar's dropdown by its data key. */
export async function selectAnnotation(page: Page, annotation: string): Promise<void> {
  const controlBar = page.locator('protspace-control-bar');
  await controlBar.locator('protspace-annotation-select .dropdown-trigger').click();
  await controlBar.locator(`.dropdown-item[data-annotation="${annotation}"]`).click();
  await page.waitForFunction(
    (key) => {
      const plot = document.querySelector('protspace-scatterplot') as
        | (Element & { selectedAnnotation?: string })
        | null;
      return plot?.selectedAnnotation === key;
    },
    annotation,
    { polling: 100 },
  );
}

/**
 * Screen coordinates of a protein's marker, in page space.
 *
 * Mirrors the projection the renderer applies: the scale maps data space into
 * the canvas, then the zoom transform is applied on top. Reads `_plotData`,
 * so it accounts for filtering and isolation reordering the slots.
 */
export async function getProteinScreenPosition(
  page: Page,
  proteinId: string,
): Promise<{ x: number; y: number }> {
  return page.evaluate((id) => {
    const plot = document.querySelector('protspace-scatterplot') as
      | (HTMLElement & {
          _plotData?: {
            length: number;
            xs: Float32Array;
            ys: Float32Array;
            originalIndices: Int32Array | null;
            proteinIds: string[];
          };
          _scales?: { x(value: number): number; y(value: number): number };
          _transform?: { x: number; y: number; k: number };
        })
      | null;
    const canvas = plot?.shadowRoot?.querySelector('canvas');
    const data = plot?._plotData;
    const scales = plot?._scales;
    const transform = plot?._transform;
    if (!plot || !canvas || !data || !scales || !transform) {
      throw new Error('Scatter plot geometry is not ready');
    }

    const proteinIndex = data.proteinIds.indexOf(id);
    const slot = data.originalIndices
      ? Array.from(data.originalIndices).findIndex((value) => value === proteinIndex)
      : proteinIndex;
    if (proteinIndex < 0 || slot < 0) {
      throw new Error(`Protein ${id} is not in the rendered view`);
    }

    const rect = canvas.getBoundingClientRect();
    return {
      x: rect.left + scales.x(data.xs[slot]) * transform.k + transform.x,
      y: rect.top + scales.y(data.ys[slot]) * transform.k + transform.y,
    };
  }, proteinId);
}

export interface ProvenanceDemoPair {
  /** A reference protein other proteins borrowed from. */
  source: string;
  /** One protein that borrowed from `source`. */
  target: string;
  /** How many proteins borrowed from `source` in total. */
  dependantCount: number;
}

/**
 * Choose a source/target pair to demonstrate provenance connectors with.
 *
 * Derived at capture time rather than hard-coded, so a regenerated bundle does
 * not silently produce an empty GIF. Picks the source with the most dependants
 * that still sits inside `maxDependants`, keeping the fan-out legible: the
 * busiest source in the venom bundle has over 300 dependants, which renders as
 * an unreadable starburst against the 20-line cap.
 */
export async function pickProvenanceDemoPair(
  page: Page,
  annotation: string,
  maxDependants = 40,
): Promise<ProvenanceDemoPair> {
  const pair = await page.evaluate(
    ({ key, cap }) => {
      const plot = document.querySelector('protspace-scatterplot') as
        | (Element & {
            data?: {
              protein_ids: string[];
              annotation_predicted?: Record<
                string,
                Array<{ source?: string; confidence?: number } | null>
              >;
            };
          })
        | null;
      const ids = plot?.data?.protein_ids;
      const cells = plot?.data?.annotation_predicted?.[key];
      if (!ids || !cells) return null;

      const dependants = new Map<string, string[]>();
      for (let i = 0; i < cells.length; i++) {
        const source = cells[i]?.source;
        if (!source) continue;
        const list = dependants.get(source);
        if (list) list.push(ids[i]);
        else dependants.set(source, [ids[i]]);
      }

      const ranked = Array.from(dependants.entries())
        .filter(([source, targets]) => targets.length >= 2 && ids.includes(source))
        .sort((a, b) => b[1].length - a[1].length);
      const chosen = ranked.find(([, targets]) => targets.length <= cap) ?? ranked[0];
      if (!chosen) return null;

      return { source: chosen[0], target: chosen[1][0], dependantCount: chosen[1].length };
    },
    { key: annotation, cap: maxDependants },
  );

  if (!pair) {
    throw new Error(`No provenance pair found for annotation "${annotation}" in the venom bundle`);
  }
  return pair;
}
