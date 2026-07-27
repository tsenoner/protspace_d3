/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import './projection-metadata';
import type { Projection } from '@protspace/utils';

type ProjectionMetadataElement = HTMLElement & {
  projection: Projection | null;
  updateComplete: Promise<unknown>;
};

/** One faithfulness entry as the backend writes it: the value plus its provenance. */
function qualityEntry(value: number | null, scope: 'local' | 'global') {
  return { value, scope, k: 15, seed: 42, sampled: false, sample_size: 1428 };
}

async function setup(metadata: Record<string, unknown>): Promise<ProjectionMetadataElement> {
  const el = document.createElement('protspace-projection-metadata') as ProjectionMetadataElement;
  el.projection = { name: 'ProtT5 — UMAP 2', metadata };
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

function rows(el: ProjectionMetadataElement): Array<[string, string]> {
  return Array.from(el.shadowRoot!.querySelectorAll('.item')).map((item) => [
    item.querySelector('dt')?.textContent?.trim() ?? '',
    item.querySelector('dd')?.textContent?.trim() ?? '',
  ]);
}

describe('protspace-projection-metadata quality rows', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders one labelled row per faithfulness metric instead of a JSON blob', async () => {
    const el = await setup({
      n_components: 2,
      quality: {
        knn_overlap: qualityEntry(0.5776844070961717, 'local'),
        trustworthiness: qualityEntry(0.9746417190838376, 'local'),
        random_triplet: qualityEntry(0.7109243697478992, 'global'),
      },
    });

    expect(rows(el)).toEqual([
      ['N Components', '2'],
      ['Knn Overlap (local)', '0.578'],
      ['Trustworthiness (local)', '0.975'],
      ['Random Triplet (global)', '0.711'],
    ]);
  });

  it('never leaves a serialized object in a value', async () => {
    const el = await setup({
      quality: { spearman_distance: qualityEntry(0.53, 'global') },
    });

    for (const [, value] of rows(el)) {
      expect(value).not.toContain('{');
    }
  });

  it('marks a metric the backend skipped as not available', async () => {
    // A metric that raised is written as `value: null`, not omitted.
    const el = await setup({ quality: { continuity: qualityEntry(null, 'local') } });

    expect(rows(el)).toEqual([['Continuity (local)', 'N/A']]);
  });
});
