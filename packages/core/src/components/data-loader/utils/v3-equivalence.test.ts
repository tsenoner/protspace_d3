import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  createParquetBundle,
  getProteinAnnotationIndices,
  getProteinEvidence,
  getProteinScores,
  isCsrAnnotationData,
  isMultilabelAnnotationData,
  isNAValue,
  NA_DEFAULT_COLOR,
  NA_VALUE,
  type VisualizationData,
} from '@protspace/utils';
import { decodeParquetBundle, extractRowsFromParquetBundle } from './bundle';
import { convertParquetToVisualizationDataOptimized } from './conversion';

/**
 * The cross-language contract for parquetbundle v3.
 *
 * `__fixtures__/v3-sample.parquetbundle` is written by the real Python encoder
 * (`apps/protspace/scripts/generate_v3_fixture.py` -> `bundle_v3.encode_v3`) and read
 * here by the real browser reader. `bundle-v3.test.ts` covers the reader against
 * hand-synthesised parts, where a corrupt manifest or a lying hit count is reachable;
 * this suite covers the half that no synthesised part can: that the two independently
 * written implementations agree on the same bytes, and that a v3-loaded dataset behaves
 * like a v2-loaded one everywhere downstream.
 *
 * The fixture is a deliberate SUPERSET of `v2-sample.parquetbundle` (2 rows, 2 columns,
 * which cannot carry an interior zero-hit row, a numeric column or a 3D projection), so
 * the two are compared only on the values they genuinely share: `protein_ids[0..1]`,
 * P1/P2's `cath` and `go_bp`, and the `pca2` coordinates.
 */

const PROTEIN_IDS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'] as const;

/** Every categorical column of the fixture, in part-1 order. */
const CATEGORICAL = ['cath', 'go_bp', 'pfam', 'kingdom', 'predicted_tm'] as const;

/**
 * The label whose own text contains the `;` the v2 cell grammar reserves as the hit
 * separator, so it travels percent-encoded and must come back decoded. Byte-identical
 * to the one in `v2-sample.parquetbundle`.
 */
const CATH_ENCODED_SEMICOLON = 'G3DSA:1.10.10.10 (Ribosomal Protein L15; Chain: K; domain 2)';

/**
 * Rows whose only "hit" is the synthetic `__NA__` the reader inserts for an empty CSR
 * row, per column that carries a score or evidence payload. These are exactly the rows
 * where CSR and nested storage legitimately disagree (see the round-trip suite).
 */
const NA_ONLY_ROWS: Readonly<Record<string, readonly string[]>> = {
  cath: ['P4'],
  go_bp: ['P2', 'P5'],
  pfam: ['P1', 'P3', 'P6'],
};

function fixture(name: string): ArrayBuffer {
  const file = readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url));
  return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
}

/** The v3 fixture through the real version-sniffing entry point. */
const loadV3 = () => decodeParquetBundle(fixture('v3-sample.parquetbundle'));

/** Any v2 container through the legacy row-object path, which is what v3 must match. */
const loadLegacy = async (buffer: ArrayBuffer): Promise<VisualizationData> =>
  convertParquetToVisualizationDataOptimized(await extractRowsFromParquetBundle(buffer));

/** One protein's view of one column, read only through the public accessors. */
interface Hits {
  labels: (string | null)[];
  scores: (number[] | null)[];
  evidence: (string | null)[];
}

function hitsOf(data: VisualizationData, key: string, proteinIndex: number): Hits {
  const annotation = data.annotations[key];
  return {
    labels: getProteinAnnotationIndices(data.annotation_data[key], proteinIndex).map(
      (valueIndex) => annotation.values[valueIndex],
    ),
    scores: getProteinScores(data, proteinIndex, key),
    evidence: getProteinEvidence(data, proteinIndex, key),
  };
}

const hitsByProtein = (data: VisualizationData, key: string): Record<string, Hits> =>
  Object.fromEntries(data.protein_ids.map((id, index) => [id, hitsOf(data, key, index)]));

describe('v3 golden fixture: the Python encoder and the browser reader agree', () => {
  it('reads the six-part container with both empty slots and no settings or statistics', async () => {
    const { data, settings } = await loadV3();

    expect(data.protein_ids).toEqual([...PROTEIN_IDS]);
    // Parts 4 and 5 are the zero-byte slots that keep the payloads part at position six.
    expect(settings).toBeNull();
    expect(data.statistics).toBeUndefined();
  });

  it('exposes exactly the declared annotations, with the EAT companion trio consumed', async () => {
    const { data } = await loadV3();

    // `kingdom__pred_value/__pred_confidence/__pred_source` are declared in the manifest
    // and physically present in part 1; `normalizeEatCompanionColumns` must consume them
    // so they never become three junk legend columns.
    expect(Object.keys(data.annotations)).toEqual([
      'cath',
      'go_bp',
      'pfam',
      'kingdom',
      'predicted_tm',
      'length',
      'hydrophobicity',
    ]);
    // Every prediction targets a protein whose curated `kingdom` is present, so the
    // overlay yields no cells at all - and must not invent an empty record either.
    expect(data.annotation_predicted).toBeUndefined();
  });

  it('stores multi-valued columns as CSR and single-valued ones as flat codes', async () => {
    const { data } = await loadV3();

    for (const key of ['cath', 'go_bp', 'pfam'] as const) {
      const storage = data.annotation_data[key];
      expect(isCsrAnnotationData(storage), key).toBe(true);
      expect(isMultilabelAnnotationData(storage), key).toBe(true);
      expect((storage as { length: number }).length).toBe(PROTEIN_IDS.length);
    }
    for (const key of ['kingdom', 'predicted_tm'] as const) {
      expect(data.annotation_data[key], key).toBeInstanceOf(Int32Array);
    }
  });

  it('decodes the scored multi column, keeping 1e-200 and 123456789 exact', async () => {
    const { data } = await loadV3();

    // Frequency-sorted, ties by first occurrence; every label appears twice here, so
    // this pins first-occurrence order. `__NA__` is appended last, never sorted in.
    expect(data.annotations.cath).toEqual({
      kind: 'categorical',
      values: [CATH_ENCODED_SEMICOLON, 'G3DSA:6.20.10.10', '6.20.10.10', NA_VALUE],
      colors: ['#F3C300', '#875692', '#F38400', NA_DEFAULT_COLOR],
      shapes: ['circle', 'circle', 'circle', 'circle'],
    });
    // The percent-encoded ';' came back as one label, not three fragments.
    expect(data.annotations.cath.values.some((value) => value?.includes('%3B'))).toBe(false);

    expect(hitsByProtein(data, 'cath')).toEqual({
      P1: {
        labels: [CATH_ENCODED_SEMICOLON, 'G3DSA:6.20.10.10'],
        scores: [[50.2], [60.5]],
        evidence: [],
      },
      P2: { labels: ['6.20.10.10'], scores: [null], evidence: [] },
      P3: { labels: ['G3DSA:6.20.10.10'], scores: [[123456789]], evidence: [] },
      P4: { labels: [NA_VALUE], scores: [null], evidence: [] },
      P5: { labels: [CATH_ENCODED_SEMICOLON], scores: [[1e-200]], evidence: [] },
      P6: { labels: ['6.20.10.10'], scores: [null], evidence: [] },
    });

    // The two values the wire format is float64 for. float32 flushes 1e-200 to zero and
    // re-spells 123456789 as 123456792, so `toEqual` above would already fail - these
    // two say why, and fail loudly if someone widens the comparison instead.
    const [eValue] = getProteinScores(data, PROTEIN_IDS.indexOf('P5'), 'cath')[0]!;
    expect(eValue).toBe(1e-200);
    expect(Math.fround(eValue)).toBe(0);
    const [large] = getProteinScores(data, PROTEIN_IDS.indexOf('P3'), 'cath')[0]!;
    expect(large).toBe(123456789);
    expect(Math.fround(large)).not.toBe(large);
  });

  it('decodes the evidenced multi column against the global evidence dictionary', async () => {
    const { data } = await loadV3();

    expect(data.annotations.go_bp).toEqual({
      kind: 'categorical',
      // 'apoptotic process' has 3 hits, 'protein folding' 2.
      values: ['apoptotic process', 'protein folding', NA_VALUE],
      colors: ['#F3C300', '#875692', NA_DEFAULT_COLOR],
      shapes: ['circle', 'circle', 'circle'],
    });

    expect(hitsByProtein(data, 'go_bp')).toEqual({
      P1: { labels: ['apoptotic process'], scores: [], evidence: ['IDA'] },
      P2: { labels: [NA_VALUE], scores: [], evidence: [null] },
      P3: {
        labels: ['apoptotic process', 'protein folding'],
        scores: [],
        // Both evidence spellings the grammar accepts, on one protein.
        evidence: ['IDA', 'ECO:0000269'],
      },
      P4: { labels: ['protein folding'], scores: [], evidence: ['IEA'] },
      P5: { labels: [NA_VALUE], scores: [], evidence: [null] },
      P6: { labels: ['apoptotic process'], scores: [], evidence: ['EXP'] },
    });
  });

  it('prefix-sums CSR rows correctly with zero hits first, interior and last', async () => {
    const { data } = await loadV3();

    expect(data.annotations.pfam).toEqual({
      kind: 'categorical',
      // The encoded '|' - the grammar's suffix separator - is decoded back into a label.
      values: ['PF00001 (7tm;1)', 'PF00002', 'PF00003 (a|b)', NA_VALUE],
      colors: ['#F3C300', '#875692', '#F38400', NA_DEFAULT_COLOR],
      shapes: ['circle', 'circle', 'circle', 'circle'],
    });

    expect(hitsByProtein(data, 'pfam')).toEqual({
      P1: { labels: [NA_VALUE], scores: [null], evidence: [] },
      // Two scores on one hit, one on the next: the score_count payload, not a 1:1 map.
      P2: { labels: ['PF00001 (7tm;1)', 'PF00002'], scores: [[1e-10, 2.5], [0.5]], evidence: [] },
      P3: { labels: [NA_VALUE], scores: [null], evidence: [] },
      // P4 immediately follows the interior empty row: its score is what an off-by-one
      // in the inserted-NA `hitEnd` would steal.
      P4: { labels: ['PF00001 (7tm;1)'], scores: [[0.25]], evidence: [] },
      P5: { labels: ['PF00003 (a|b)'], scores: [[3]], evidence: [] },
      P6: { labels: [NA_VALUE], scores: [null], evidence: [] },
    });
  });

  it('decodes a plain categorical column with no NA slot at all', async () => {
    const { data } = await loadV3();

    expect(data.annotations.kingdom).toEqual({
      kind: 'categorical',
      values: ['Bacteria', 'Archaea', 'Eukaryota'],
      colors: ['#F3C300', '#875692', '#F38400'],
      shapes: ['circle', 'circle', 'circle'],
    });
    // Every row has a kingdom, so no synthetic category may be appended.
    expect(data.annotations.kingdom.values.some(isNAValue)).toBe(false);
    expect(Array.from(data.annotation_data.kingdom as Int32Array)).toEqual([0, 1, 0, 2, 0, 1]);
  });

  it('folds every missing-value spelling in one dictionary into a single NA slot', async () => {
    const { data } = await loadV3();

    // The encoder is faithful: part 6 carries `none` (3 rows) and `NA` (1 row) as two
    // ordinary labels, because collapsing them corrupts the Python side. The browser
    // makes the display decision, and must land them in ONE bucket, not two.
    expect(data.annotations.predicted_tm).toEqual({
      kind: 'categorical',
      values: ['TM helix', NA_VALUE],
      colors: ['#F3C300', NA_DEFAULT_COLOR],
      shapes: ['circle', 'circle'],
    });
    expect(data.annotations.predicted_tm.values.filter(isNAValue)).toHaveLength(1);

    const naIndex = data.annotations.predicted_tm.values.findIndex(isNAValue);
    const codes = Array.from(data.annotation_data.predicted_tm as Int32Array);
    expect(codes.filter((code) => code === naIndex)).toHaveLength(4);
    // All three `none` rows plus the single `NA` row, and nothing else.
    expect(codes).toEqual([naIndex, naIndex, 0, naIndex, naIndex, 0]);
  });

  it('reads numeric columns with their declared int/float type and null for blanks', async () => {
    const { data } = await loadV3();

    expect(data.annotations.length).toEqual({
      kind: 'numeric',
      numericType: 'int',
      values: [],
      colors: [],
      shapes: [],
    });
    expect(data.annotations.hydrophobicity).toMatchObject({
      kind: 'numeric',
      numericType: 'float',
    });
    expect(data.numeric_annotation_data).toEqual({
      length: [120, null, 340, 0, -15, 1024],
      hydrophobicity: [0.5, -1.25, null, 3, 0.001, 42],
    });
    // A numeric column carries no categorical storage to bin by code.
    expect(data.annotation_data.length).toBeUndefined();
  });

  it('interleaves the wide axis columns into a 2D and a 3D projection', async () => {
    const { data } = await loadV3();

    expect(data.projections.map((projection) => projection.name)).toEqual(['pca2', 'umap3']);
    const [pca2, umap3] = data.projections;

    expect(pca2.dimension).toBe(2);
    expect(Array.from(pca2.data)).toEqual([0, 0, 1, 1, 2.5, -3.5, -4, 0.25, 5, 5, -1.5, 2]);
    expect(pca2.metadata).toMatchObject({ components: 2, dimension: 2, dimensions: 2 });

    expect(umap3.dimension).toBe(3);
    expect(Array.from(umap3.data)).toEqual(Array.from({ length: 18 }, (_, index) => index / 4));
    expect(umap3.metadata).toMatchObject({ n_neighbors: 15, dimension: 3, dimensions: 3 });
  });
});

describe('v3 -> v2 export round trip: CSR storage is interchangeable with nested', () => {
  it('re-exports every categorical cell the encoder wrote, NA spellings excepted', async () => {
    const { data } = await loadV3();
    const extraction = await extractRowsFromParquetBundle(createParquetBundle(data));

    // The writer still stamps v2, so this proves the v2 cell grammar can be rebuilt from
    // CSR storage: the reserved ';' and '|' inside labels go back out percent-encoded,
    // scores rejoin with ',', evidence with '|'.
    expect(extraction.formatVersion).toBe(2);
    const cells = Object.fromEntries(
      [...extraction.annotationsById].map(([id, row]) => [
        id,
        Object.fromEntries(CATEGORICAL.map((key) => [key, row[key] ?? null])),
      ]),
    );
    const cathSemicolon = 'G3DSA:1.10.10.10 (Ribosomal Protein L15%3B Chain: K%3B domain 2)';
    expect(cells).toEqual({
      P1: {
        cath: `${cathSemicolon}|50.2;G3DSA:6.20.10.10|60.5`,
        go_bp: 'apoptotic process|IDA',
        pfam: null,
        kingdom: 'Bacteria',
        // Documented non-identity: `none` is a MISSING_VALUE_TOKEN, so it was folded to
        // `__NA__` on read and goes back out as NULL, not as the literal word.
        predicted_tm: null,
      },
      P2: {
        cath: '6.20.10.10',
        go_bp: null,
        pfam: 'PF00001 (7tm%3B1)|1e-10,2.5;PF00002|0.5',
        kingdom: 'Archaea',
        predicted_tm: null,
      },
      P3: {
        cath: 'G3DSA:6.20.10.10|123456789',
        go_bp: 'apoptotic process|IDA;protein folding|ECO:0000269',
        pfam: null,
        kingdom: 'Bacteria',
        predicted_tm: 'TM helix',
      },
      P4: {
        cath: null,
        go_bp: 'protein folding|IEA',
        pfam: 'PF00001 (7tm%3B1)|0.25',
        kingdom: 'Eukaryota',
        predicted_tm: null,
      },
      P5: {
        cath: `${cathSemicolon}|1e-200`,
        go_bp: null,
        pfam: 'PF00003 (a%7Cb)|3',
        kingdom: 'Bacteria',
        // The other missing-value spelling in the same column, same treatment.
        predicted_tm: null,
      },
      P6: {
        cath: '6.20.10.10',
        go_bp: 'apoptotic process|EXP',
        pfam: null,
        kingdom: 'Archaea',
        predicted_tm: 'TM helix',
      },
    });
    // The in-memory sentinel is never written as a literal 6-char category.
    for (const row of extraction.annotationsById.values()) {
      expect(Object.values(row)).not.toContain(NA_VALUE);
    }
  });

  it('reloads into the same legend, the same numerics and the same projections', async () => {
    const { data: v3 } = await loadV3();
    const reloaded = await loadLegacy(createParquetBundle(v3));

    expect(reloaded.protein_ids).toEqual(v3.protein_ids);
    // Values, colours and shapes are what the legend and the palette are built from, so
    // they have to survive a shape change that reorders nothing.
    expect(reloaded.annotations).toEqual(v3.annotations);
    expect(reloaded.numeric_annotation_data).toEqual(v3.numeric_annotation_data);
    expect(reloaded.annotation_predicted).toBeUndefined();
    expect(
      reloaded.projections.map(({ name, dimension, data }) => ({
        name,
        dimension,
        data: Array.from(data),
      })),
    ).toEqual(
      v3.projections.map(({ name, dimension, data }) => ({
        name,
        dimension,
        data: Array.from(data),
      })),
    );
  });

  it('reloads into nested storage that reads back identically through the accessors', async () => {
    const { data: v3 } = await loadV3();
    const reloaded = await loadLegacy(createParquetBundle(v3));

    // Precondition: the two datasets really are stored differently, otherwise the
    // comparison below proves nothing about CSR at all.
    expect(isCsrAnnotationData(v3.annotation_data.cath)).toBe(true);
    expect(isCsrAnnotationData(reloaded.annotation_data.cath)).toBe(false);
    expect(v3.annotation_data.kingdom).toBeInstanceOf(Int32Array);
    expect(reloaded.annotation_data.kingdom).not.toBeInstanceOf(Int32Array);

    for (const key of CATEGORICAL) {
      for (const [index, id] of v3.protein_ids.entries()) {
        const from3 = hitsOf(v3, key, index);
        const from2 = hitsOf(reloaded, key, index);
        const where = `${key}/${id}`;

        expect(from2.labels, where).toEqual(from3.labels);

        // The ONE documented non-identity. An empty CSR row owns no hit slot, so the
        // reader inserts a synthetic `__NA__` hit for it - and the flat score/evidence
        // payloads are numbered by hit, so that inserted hit reports itself as `null`.
        // Nested storage has no hit there at all and reports nothing. Asserted as the
        // exact rows it applies to rather than by relaxing the comparison.
        if (NA_ONLY_ROWS[key]?.includes(id)) {
          expect(from3.labels, where).toEqual([NA_VALUE]);
          const scored = key !== 'go_bp';
          expect(from3.scores, where).toEqual(scored ? [null] : []);
          expect(from3.evidence, where).toEqual(scored ? [] : [null]);
          expect(from2.scores, where).toEqual([]);
          expect(from2.evidence, where).toEqual([]);
          continue;
        }

        expect(from2.scores, where).toEqual(from3.scores);
        expect(from2.evidence, where).toEqual(from3.evidence);
      }
    }
  });
});

describe('v2 and v3 fixtures agree on the values they share', () => {
  it('gives P1 and P2 the same ids, cath/go_bp hits and pca2 coordinates', async () => {
    const { data: v3 } = await loadV3();
    const v2 = await loadLegacy(fixture('v2-sample.parquetbundle'));

    // The v3 fixture is a superset: 6 proteins to the v2 sample's 2, and 7 columns to
    // its 2. Only the shared prefix is comparable.
    expect(v2.protein_ids).toEqual(v3.protein_ids.slice(0, 2));

    for (const [index, id] of v2.protein_ids.entries()) {
      const cath3 = hitsOf(v3, 'cath', index);
      expect(hitsOf(v2, 'cath', index), `cath/${id}`).toEqual(cath3);

      const go2 = hitsOf(v2, 'go_bp', index);
      const go3 = hitsOf(v3, 'go_bp', index);
      expect(go2.labels, `go_bp/${id}`).toEqual(go3.labels);
      expect(go2.scores, `go_bp/${id}`).toEqual(go3.scores);
      // P2's go_bp cell is empty in both fixtures, which is the same nested-vs-CSR
      // non-identity the round trip above documents.
      expect(go2.evidence, `go_bp/${id}`).toEqual(id === 'P2' ? [] : go3.evidence);
    }
    expect(hitsOf(v2, 'go_bp', 0).evidence).toEqual(['IDA']);

    const pca2v2 = v2.projections.find((projection) => projection.name === 'pca2')!;
    const pca2v3 = v3.projections.find((projection) => projection.name === 'pca2')!;
    expect(pca2v2.dimension).toBe(pca2v3.dimension);
    expect(Array.from(pca2v2.data)).toEqual(Array.from(pca2v3.data.subarray(0, 4)));
  });
});
