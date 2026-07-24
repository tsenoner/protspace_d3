import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BUNDLE_DELIMITER_BYTES, annotationStatSummary } from '@protspace/utils';
import { extractRowsFromParquetBundle } from './bundle';
import { convertParquetToVisualizationDataOptimized } from './conversion';

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

/** Join parts with the bundle delimiter. An empty part yields a zero-byte slot. */
function joinParts(parts: Uint8Array[]): ArrayBuffer {
  const size =
    parts.reduce((total, part) => total + part.byteLength, 0) +
    BUNDLE_DELIMITER_BYTES.length * (parts.length - 1);
  const out = new Uint8Array(size);
  let offset = 0;
  parts.forEach((part, index) => {
    out.set(part, offset);
    offset += part.byteLength;
    if (index < parts.length - 1) {
      out.set(BUNDLE_DELIMITER_BYTES, offset);
      offset += BUNDLE_DELIMITER_BYTES.length;
    }
  });
  return out.buffer;
}

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
});
