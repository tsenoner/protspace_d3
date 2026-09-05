import { describe, it, expect } from 'vitest';
import type { VisualizationData } from '@protspace/utils';
import { collectTransferables } from './decode-transferables';

/**
 * Hand-built CSR dataset. `end` and `codes` deliberately share one ArrayBuffer, which
 * is the case that makes deduplication load-bearing: `postMessage` throws
 * `DataCloneError` on a transfer list that names the same buffer twice.
 */
function csrDataset(): { data: VisualizationData; shared: ArrayBuffer } {
  const shared = new ArrayBuffer(6 * 4);
  const end = new Int32Array(shared, 0, 3); // 3 proteins
  const codes = new Int32Array(shared, 12, 3);
  end.set([1, 2, 3]);
  codes.set([0, 1, 0]);

  return {
    shared,
    data: {
      protein_ids: ['P1', 'P2', 'P3'],
      projections: [
        { name: 'pca2', data: new Float32Array(6), dimension: 2 },
        { name: 'umap3', data: new Float32Array(9), dimension: 3 },
      ],
      annotations: {
        go_bp: { kind: 'categorical', values: ['a', 'b'], colors: [], shapes: [] },
        organism: { kind: 'categorical', values: ['x'], colors: [], shapes: [] },
      },
      annotation_data: {
        go_bp: { kind: 'csr', end, codes, length: 3 },
        organism: new Int32Array([0, 0, 0]),
      },
      annotation_scores_csr: {
        go_bp: { hitEnd: new Int32Array([1, 1, 2]), values: new Float32Array([0.5, 0.25]) },
      },
      annotation_evidence_csr: {
        go_bp: { codes: new Int32Array([-1, 0, -1]), dict: ['IDA'] },
      },
    },
  };
}

describe('collectTransferables', () => {
  it('names every bulk buffer exactly once, even when two views share one', () => {
    const { data, shared } = csrDataset();
    const transfer = collectTransferables(data);

    expect(new Set(transfer).size).toBe(transfer.length);
    expect(transfer).toContain(shared);
    // 2 projections + the shared CSR buffer + organism codes + score hitEnd + score
    // values + evidence codes. Without deduplication this would be 8: `end` and
    // `codes` would each name `shared`.
    expect(transfer).toHaveLength(7);
  });

  it('actually transfers: every source buffer is detached afterwards', () => {
    const { data } = csrDataset();
    const transfer = collectTransferables(data);
    const sources = [
      ...data.projections.map((projection) => projection.data),
      data.annotation_data.organism as Int32Array,
      data.annotation_scores_csr!.go_bp.values,
      data.annotation_evidence_csr!.go_bp.codes,
    ];

    const clone = structuredClone(data, { transfer });

    expect(clone.protein_ids).toEqual(['P1', 'P2', 'P3']);
    expect(sources.every((array) => array.byteLength === 0)).toBe(true);
  });

  it('leaves a v1/v2 dataset with only its projection and Int32Array buffers', () => {
    const data: VisualizationData = {
      protein_ids: ['P1'],
      projections: [{ name: 'pca2', data: new Float32Array(2), dimension: 2 }],
      annotations: { organism: { kind: 'categorical', values: ['x'], colors: [], shapes: [] } },
      annotation_data: { organism: new Int32Array([0]), multi: [[0]] },
    };

    expect(collectTransferables(data)).toHaveLength(2);
  });
});
