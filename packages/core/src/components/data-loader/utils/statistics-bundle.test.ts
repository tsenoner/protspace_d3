import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parquetWriteBuffer } from 'hyparquet-writer';
import {
  BUNDLE_DELIMITER_BYTES,
  annotationStatSummary,
  concatenateBuffers,
  createParquetBundle,
} from '@protspace/utils';
import { extractRowsFromParquetBundle } from './bundle';
import {
  convertParquetToVisualizationData,
  convertParquetToVisualizationDataOptimized,
} from './conversion';

/**
 * Statistics part (5th) of a `.parquetbundle`, produced by the backend's `--stats` flag.
 *
 * The fixtures are REAL backend output — the `statistics.parquet` and `settings.parquet` parts
 * of a 1,428-protein 3FTx/ProtT5 run (`--stats --cluster-selection both --stats-annotation
 * auto`). They are glued onto the existing tiny `v2-sample` core here rather than committing
 * that run's whole 148 KB bundle: the core parts are irrelevant to this path, and the parts
 * that matter are byte-for-byte what the backend writes.
 */

const fixture = (name: string): Uint8Array =>
  new Uint8Array(readFileSync(resolve(__dirname, '__fixtures__', name)));

const STATISTICS = fixture('stats-sample-statistics.parquet');
const SETTINGS = fixture('stats-sample-settings.parquet');
/** A real 3-part (2-delimiter) bundle: annotations, projections metadata, projections. */
const CORE = fixture('v2-sample.parquetbundle');

/** Join parts with the writer's own framing. An empty part yields a zero-byte slot. */
const joinParts = (parts: Uint8Array[]): ArrayBuffer =>
  concatenateBuffers(
    parts.map((part) => part.slice().buffer),
    BUNDLE_DELIMITER_BYTES,
  );

/** `[core, core, core]` + whatever trailing parts a case needs. */
const bundleWith = (...trailing: Uint8Array[]): ArrayBuffer => joinParts([CORE, ...trailing]);

describe('statistics part of a parquetbundle', () => {
  it('loads a 5-part bundle (core + settings + statistics)', async () => {
    const extraction = await extractRowsFromParquetBundle(bundleWith(SETTINGS, STATISTICS));

    expect(extraction.settings).not.toBeNull();
    expect(extraction.statistics).not.toBeNull();
    expect(extraction.statistics!.length).toBeGreaterThan(0);
  });

  it('reads the statistics part when the settings slot is empty', async () => {
    const extraction = await extractRowsFromParquetBundle(
      bundleWith(new Uint8Array(0), STATISTICS),
    );

    expect(extraction.settings).toBeNull();
    expect(extraction.statistics!.length).toBeGreaterThan(0);
  });

  it('keeps 3- and 4-part bundles working, with no statistics', async () => {
    expect((await extractRowsFromParquetBundle(joinParts([CORE]))).statistics).toBeNull();
    expect((await extractRowsFromParquetBundle(bundleWith(SETTINGS))).statistics).toBeNull();
  });

  it('ignores a statistics part that is not a parquet file', async () => {
    const notParquet = new TextEncoder().encode('definitely not parquet');
    const extraction = await extractRowsFromParquetBundle(bundleWith(SETTINGS, notParquet));

    // Supplementary data must never fail the load.
    expect(extraction.statistics).toBeNull();
    expect(extraction.projections.length).toBeGreaterThan(0);
  });

  it('preserves the tidy row schema the UI keys off', async () => {
    const { statistics } = await extractRowsFromParquetBundle(bundleWith(SETTINGS, STATISTICS));

    expect(Object.keys(statistics![0]).sort()).toEqual([
      'annotation',
      'extra_json',
      'label_kind',
      'metric',
      'metric_kind',
      'space_kind',
      'space_name',
      'stat_family',
      'value',
    ]);
  });

  it('carries statistics through conversion onto VisualizationData', async () => {
    const extraction = await extractRowsFromParquetBundle(bundleWith(SETTINGS, STATISTICS));
    const data = await convertParquetToVisualizationDataOptimized(extraction);

    expect(data.statistics).toBe(extraction.statistics);
  });

  it('summarises a real annotation against the projection it was scored in', async () => {
    const { statistics } = await extractRowsFromParquetBundle(bundleWith(SETTINGS, STATISTICS));
    const summary = annotationStatSummary(statistics!, 'major_group', 'ProtT5 — UMAP 2');

    // Values from the fixture run: UMAP separates `major_group` better than the raw ProtT5
    // embedding does (0.326 vs 0.095), and the auto-clusters partly recover it.
    expect(summary!.validity.map((metric) => metric.metric)).toEqual([
      'silhouette',
      'davies_bouldin',
      'calinski_harabasz',
    ]);
    expect(summary!.validity[0].value).toBeCloseTo(0.326, 3);
    expect(summary!.validity[0].embedding).toBeCloseTo(0.095, 3);
    expect(summary!.agreement.map((group) => group.label)).toEqual(['elbow K', 'silhouette K']);
  });

  it('reports no statistics for an annotation the run did not score', async () => {
    const { statistics } = await extractRowsFromParquetBundle(bundleWith(SETTINGS, STATISTICS));

    expect(annotationStatSummary(statistics!, 'not_scored', 'ProtT5 — UMAP 2')).toBeNull();
  });

  it('ignores a statistics part whose kind columns were renamed', async () => {
    // A drifted schema that keeps the five value columns but renames `space_kind`: every
    // consumer branches on it, so the rows are unusable — and silently produce zero ⓘ icons.
    const drifted = new Uint8Array(
      parquetWriteBuffer({
        columnData: [
          { name: 'space_type', data: ['projection'], type: 'STRING' },
          { name: 'space_name', data: ['UMAP 2'], type: 'STRING' },
          { name: 'annotation', data: ['major_group'], type: 'STRING' },
          { name: 'stat_family', data: ['annotation_validity'], type: 'STRING' },
          { name: 'label_kind', data: ['annotation'], type: 'STRING' },
          { name: 'metric', data: ['silhouette'], type: 'STRING' },
          { name: 'metric_kind', data: ['validity'], type: 'STRING' },
          { name: 'value', data: [0.326], type: 'DOUBLE' },
        ],
      }),
    );
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const extraction = await extractRowsFromParquetBundle(bundleWith(SETTINGS, drifted));

    expect(extraction.statistics).toBeNull();
    expect(warn).toHaveBeenCalledWith('Statistics parquet has an unexpected schema, ignoring it');
    warn.mockRestore();
  });

  it('coerces an INT64 value column to numbers', async () => {
    // pyarrow types an all-integer column int64 by default; hyparquet reads that as BigInt,
    // which would render every metric as '—' and crash the DOUBLE writer on re-export.
    const int64Stats = new Uint8Array(
      parquetWriteBuffer({
        columnData: [
          { name: 'space_kind', data: ['projection'], type: 'STRING' },
          { name: 'space_name', data: ['UMAP 2'], type: 'STRING' },
          { name: 'annotation', data: ['major_group'], type: 'STRING' },
          { name: 'stat_family', data: ['annotation_validity'], type: 'STRING' },
          { name: 'label_kind', data: ['annotation'], type: 'STRING' },
          { name: 'metric', data: ['silhouette'], type: 'STRING' },
          { name: 'metric_kind', data: ['validity'], type: 'STRING' },
          { name: 'value', data: [7n], type: 'INT64' },
          { name: 'extra_json', data: [''], type: 'STRING' },
        ],
      }),
    );

    const { statistics } = await extractRowsFromParquetBundle(bundleWith(SETTINGS, int64Stats));

    expect(statistics![0].value).toBe(7);
    expect(typeof statistics![0].value).toBe('number');
  });

  it('keeps a NULL extra_json cell NULL across a re-export', async () => {
    const withNullExtra = new Uint8Array(
      parquetWriteBuffer({
        columnData: [
          { name: 'space_kind', data: ['projection'], type: 'STRING' },
          { name: 'space_name', data: ['UMAP 2'], type: 'STRING' },
          { name: 'annotation', data: ['major_group'], type: 'STRING' },
          { name: 'stat_family', data: ['annotation_validity'], type: 'STRING' },
          { name: 'label_kind', data: ['annotation'], type: 'STRING' },
          { name: 'metric', data: ['silhouette'], type: 'STRING' },
          { name: 'metric_kind', data: ['validity'], type: 'STRING' },
          { name: 'value', data: [0.5], type: 'DOUBLE' },
          { name: 'extra_json', data: [null], type: 'STRING' },
        ],
      }),
    );
    const extraction = await extractRowsFromParquetBundle(bundleWith(SETTINGS, withNullExtra));
    const data = convertParquetToVisualizationData(extraction);

    const exported = await extractRowsFromParquetBundle(createParquetBundle(data));

    // '' would be a lossy rewrite: absent provenance must read back as absent.
    expect(exported.statistics![0].extra_json ?? null).toBeNull();
  });

  it('round-trips the statistics part through an export', async () => {
    const extraction = await extractRowsFromParquetBundle(bundleWith(SETTINGS, STATISTICS));
    const data = convertParquetToVisualizationData(extraction);
    expect(data.statistics!.length).toBeGreaterThan(0);

    const exported = await extractRowsFromParquetBundle(createParquetBundle(data));

    expect(exported.statistics).not.toBeNull();
    expect(exported.statistics!.length).toBe(data.statistics!.length);
    expect(exported.statistics![0]).toMatchObject({
      space_kind: data.statistics![0].space_kind,
      space_name: data.statistics![0].space_name,
      annotation: data.statistics![0].annotation,
      metric: data.statistics![0].metric,
      value: data.statistics![0].value,
    });
  });

  it('round-trips settings alongside statistics (full 5-part bundle)', async () => {
    const extraction = await extractRowsFromParquetBundle(bundleWith(SETTINGS, STATISTICS));
    const data = convertParquetToVisualizationData(extraction);
    const settings = { legendSettings: {}, exportOptions: {}, eatConfidenceThreshold: 0.75 };

    const exported = await extractRowsFromParquetBundle(
      createParquetBundle(data, { includeSettings: true, settings }),
    );

    expect(exported.settings).not.toBeNull();
    expect(exported.settings!.eatConfidenceThreshold).toBe(0.75);
    expect(exported.statistics).not.toBeNull();
    expect(exported.statistics!.length).toBe(data.statistics!.length);
  });

  it('omits the statistics part when the caller opts out', async () => {
    const extraction = await extractRowsFromParquetBundle(bundleWith(SETTINGS, STATISTICS));
    const data = convertParquetToVisualizationData(extraction);

    const exported = await extractRowsFromParquetBundle(
      createParquetBundle(data, { includeStatistics: false }),
    );

    expect(exported.statistics).toBeNull();
  });

  it('does not misparse the settings slot from a 3-part bundle (partAt range guard)', async () => {
    // Regression coverage for the `partAt` out-of-range guard in `bundle.ts`: on a plain 3-part
    // bundle, slots 3 and 4 (settings, statistics) must resolve to `null`, not a mis-sliced view
    // of the whole buffer. The statistics path fails silent on a mis-slice (0 rows → `return
    // null`), so it can't catch a deleted guard; the settings path warns on every outcome
    // (0 rows, rows without a string `settings_json`, or a parse throw), so it can.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const extraction = await extractRowsFromParquetBundle(joinParts([CORE]));

    expect(extraction.settings).toBeNull();
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
