/**
 * The loader and the renderer must agree on one number.
 *
 * They previously did not: the loader admitted 2,000,000 rows while the renderer
 * drew at most 1,000,000 points, so a single-projection bundle at the loader's
 * own limit displayed half its proteins — silently, cut by array position rather
 * than by anything the user could reason about (#456).
 *
 * `AGENTS.md` is explicit that a fact living in two places is pinned by a test,
 * not by a comment asking the next reader to keep them in step. This is that
 * test.
 */
import { describe, expect, it } from 'vitest';
import { MAX_POINTS_PER_PROJECTION } from './limits';
import { MAX_RENDERABLE_POINTS } from '../components/scatter-plot/webgl/types';
import { getValidationLimitsForTest } from '../components/data-loader/utils/validation';

describe('point-count limits', () => {
  it('the renderer clamp is the shared cap', () => {
    expect(MAX_RENDERABLE_POINTS).toBe(MAX_POINTS_PER_PROJECTION);
  });

  it('the loader row cap is the shared cap', () => {
    expect(getValidationLimitsForTest().maxRows).toBe(MAX_POINTS_PER_PROJECTION);
  });

  it('the loader can never admit more points per projection than the renderer draws', () => {
    // projections_data is long-format: rows = proteins x projections. So for any
    // projection count >= 1, capping rows at the point cap bounds proteins per
    // projection by that same cap — which is what makes the renderer's clamp
    // unreachable through any file a user can load.
    const rowCap = getValidationLimitsForTest().maxRows;
    for (const projections of [1, 2, 3, 10]) {
      const maxProteinsAdmitted = Math.floor(rowCap / projections);
      expect(maxProteinsAdmitted).toBeLessThanOrEqual(MAX_RENDERABLE_POINTS);
    }
  });
});
