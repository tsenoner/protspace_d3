/**
 * Bundle writer utilities for creating .parquetbundle files with optional settings and
 * statistics.
 *
 * Bundle format:
 * - Part 1: selected_annotations.parquet (identifier + annotation columns)
 * - Delimiter: ---PARQUET_DELIMITER---
 * - Part 2: projections_metadata.parquet (projection_name, dimensions, info_json)
 * - Delimiter: ---PARQUET_DELIMITER---
 * - Part 3: projections_data.parquet (projection_name, identifier, x, y, z)
 * - Delimiter: ---PARQUET_DELIMITER--- (present when a 4th part follows)
 * - Part 4: settings.parquet (settings_json column) — present whenever settings are
 *   included; also written as a MANDATORY ZERO-BYTE placeholder when statistics are
 *   included without settings, so the statistics part keeps a fixed slot (5)
 * - Delimiter: ---PARQUET_DELIMITER--- (present when a 5th part follows)
 * - Part 5: statistics.parquet (tidy annotation/cluster stat rows), only when statistics
 *   are included
 *
 * Resulting layouts: 3 parts (no settings, no statistics), 4 parts (settings only), or
 * 5 parts (statistics present, with part 4 either real settings or the zero-byte
 * placeholder above).
 */

import { parquetWriteBuffer } from 'hyparquet-writer';
import type { VisualizationData, BundleSettings, ProjectionStatisticRow } from '../types';
import { BUNDLE_DELIMITER_BYTES } from './constants';
import { bigIntReplacer } from './bigint-utils';
import { isNumericAnnotation } from '../visualization/numeric-binning.js';
import { getProteinAnnotationIndices } from '../visualization/annotation-data-access.js';
import { getEatCompanionColumn, getPredictedCellValues } from '../visualization/eat-overlay.js';
import { encodeAnnotationField } from './annotation-codec.js';

const ANNOTATION_FORMAT_VERSION = '2';
const ANNOTATION_FORMAT_VERSION_KEY = 'protspace_format_version';

/** Column data format for parquetWriteBuffer */
interface ColumnData {
  name: string;
  data: (string | number | boolean | null)[];
  type?: 'STRING' | 'INT32' | 'INT64' | 'DOUBLE' | 'FLOAT' | 'BOOLEAN';
}

function serializeCategoricalValue(
  label: string,
  evidence: string | null | undefined,
  scores: readonly number[] | null | undefined,
): string {
  const encodedLabel = encodeAnnotationField(label);
  if (evidence) return `${encodedLabel}|${evidence}`;
  if (scores && scores.length > 0) return `${encodedLabel}|${scores.join(',')}`;
  return encodedLabel;
}

/**
 * Create the annotations parquet buffer (Part 1).
 * Contains identifier column + all annotation columns.
 */
function createAnnotationsParquet(data: VisualizationData): ArrayBuffer {
  const columnData: ColumnData[] = [
    {
      name: 'identifier',
      data: data.protein_ids,
      type: 'STRING',
    },
  ];

  // Add annotation columns
  for (const [annotationName, annotation] of Object.entries(data.annotations)) {
    // Runtime-only numeric view over the prediction side-channel.
    if (annotation.runtime?.role === 'eat-confidence') continue;

    if (isNumericAnnotation(annotation)) {
      const values = data.numeric_annotation_data?.[annotationName] ?? [];
      columnData.push({
        name: annotationName,
        data: values,
        type: 'DOUBLE',
      });
      continue;
    }

    const annotationIndices = data.annotation_data[annotationName];
    if (!annotationIndices) continue;

    // Convert indices back to actual annotation values
    const values: (string | null)[] = new Array(data.protein_ids.length);
    for (let i = 0; i < data.protein_ids.length; i++) {
      if (data.annotation_predicted?.[annotationName]?.[i]) {
        values[i] = null;
        continue;
      }

      // Reconstruct the v2 wire cell positionally so decoded labels, evidence, and scores survive
      // export without structural semicolons/pipes being reinterpreted on reload.
      const cellValues = getProteinAnnotationIndices(annotationIndices, i).flatMap(
        (valueIndex, cellIndex) => {
          const value = annotation.values[valueIndex];
          if (value == null) return [];
          const evidence = data.annotation_evidence?.[annotationName]?.[i]?.[cellIndex];
          const scores = data.annotation_scores?.[annotationName]?.[i]?.[cellIndex];
          return [serializeCategoricalValue(value, evidence, scores)];
        },
      );
      values[i] = cellValues.length > 0 ? cellValues.join(';') : null;
    }

    columnData.push({
      name: annotationName,
      data: values,
      type: 'STRING',
    });

    const predictedCells = data.annotation_predicted?.[annotationName];
    if (predictedCells?.some(Boolean)) {
      columnData.push(
        {
          name: getEatCompanionColumn(annotationName, 'value'),
          data: predictedCells.map((cell) => {
            if (!cell) return null;
            return getPredictedCellValues(cell)
              .map((label, index) =>
                serializeCategoricalValue(
                  label,
                  cell.evidence?.[index],
                  cell.scores?.[index] ?? null,
                ),
              )
              .join(';');
          }),
          type: 'STRING',
        },
        {
          name: getEatCompanionColumn(annotationName, 'confidence'),
          data: predictedCells.map((cell) => cell?.confidence ?? null),
          type: 'FLOAT',
        },
        {
          name: getEatCompanionColumn(annotationName, 'source'),
          data: predictedCells.map((cell) => (cell ? encodeAnnotationField(cell.source) : null)),
          type: 'STRING',
        },
      );
    }
  }

  return parquetWriteBuffer({
    columnData,
    kvMetadata: [{ key: ANNOTATION_FORMAT_VERSION_KEY, value: ANNOTATION_FORMAT_VERSION }],
  });
}

/**
 * Create the projections metadata parquet buffer (Part 2).
 * Contains projection_name, dimensions, info_json columns.
 */
function createProjectionsMetadataParquet(data: VisualizationData): ArrayBuffer {
  const projectionNames: string[] = [];
  const dimensions: number[] = [];
  const infoJsons: string[] = [];

  for (const projection of data.projections) {
    projectionNames.push(projection.name);
    const dim = projection.dimension;
    dimensions.push(dim);
    infoJsons.push(JSON.stringify(projection.metadata ?? {}, bigIntReplacer));
  }

  const columnData: ColumnData[] = [
    { name: 'projection_name', data: projectionNames, type: 'STRING' },
    { name: 'dimensions', data: dimensions, type: 'INT32' },
    { name: 'info_json', data: infoJsons, type: 'STRING' },
  ];

  return parquetWriteBuffer({ columnData });
}

/**
 * Create the projections data parquet buffer (Part 3).
 * Contains projection_name, identifier, x, y, z columns.
 */
function createProjectionsDataParquet(data: VisualizationData): ArrayBuffer {
  // Calculate total rows: proteins * projections
  const totalRows = data.protein_ids.length * data.projections.length;

  const projectionNames: string[] = new Array(totalRows);
  const identifiers: string[] = new Array(totalRows);
  const xValues: number[] = new Array(totalRows);
  const yValues: number[] = new Array(totalRows);
  const zValues: (number | null)[] = new Array(totalRows);

  let rowIndex = 0;
  for (const projection of data.projections) {
    for (let i = 0; i < data.protein_ids.length; i++) {
      const base = i * projection.dimension;
      projectionNames[rowIndex] = projection.name;
      identifiers[rowIndex] = data.protein_ids[i];
      xValues[rowIndex] = projection.data[base];
      yValues[rowIndex] = projection.data[base + 1];
      zValues[rowIndex] = projection.dimension === 3 ? projection.data[base + 2] : null;
      rowIndex++;
    }
  }

  const columnData: ColumnData[] = [
    { name: 'projection_name', data: projectionNames, type: 'STRING' },
    { name: 'identifier', data: identifiers, type: 'STRING' },
    { name: 'x', data: xValues, type: 'DOUBLE' },
    { name: 'y', data: yValues, type: 'DOUBLE' },
    { name: 'z', data: zValues, type: 'DOUBLE' },
  ];

  return parquetWriteBuffer({ columnData });
}

/**
 * Create the settings parquet buffer (Part 4 - optional).
 * Contains a single settings_json column with one row.
 */
function createSettingsParquet(settings: BundleSettings): ArrayBuffer {
  const columnData: ColumnData[] = [
    {
      name: 'settings_json',
      data: [JSON.stringify(settings, bigIntReplacer)],
      type: 'STRING',
    },
  ];

  return parquetWriteBuffer({ columnData });
}

/**
 * Serialize the tidy statistics table (5th part). Column names and order mirror the backend's
 * `STATS_SCHEMA`, so a re-exported bundle reads back exactly like the original.
 */
function createStatisticsParquet(rows: readonly ProjectionStatisticRow[]): ArrayBuffer {
  const columnData: ColumnData[] = [
    { name: 'space_kind', data: rows.map((row) => row.space_kind), type: 'STRING' },
    { name: 'space_name', data: rows.map((row) => row.space_name), type: 'STRING' },
    { name: 'annotation', data: rows.map((row) => row.annotation), type: 'STRING' },
    { name: 'stat_family', data: rows.map((row) => row.stat_family), type: 'STRING' },
    { name: 'label_kind', data: rows.map((row) => row.label_kind), type: 'STRING' },
    { name: 'metric', data: rows.map((row) => row.metric), type: 'STRING' },
    { name: 'metric_kind', data: rows.map((row) => row.metric_kind), type: 'STRING' },
    { name: 'value', data: rows.map((row) => row.value), type: 'DOUBLE' },
    // `?? null` (not ''): the column is OPTIONAL in parquet, and a NULL provenance cell must
    // survive a re-export as NULL, not decay into an empty string.
    { name: 'extra_json', data: rows.map((row) => row.extra_json ?? null), type: 'STRING' },
  ];

  return parquetWriteBuffer({ columnData });
}

function hasBundleSettings(settings: BundleSettings | undefined): settings is BundleSettings {
  if (!settings) {
    return false;
  }

  return (
    Object.keys(settings.legendSettings).length > 0 ||
    Object.keys(settings.exportOptions).length > 0 ||
    settings.publishState !== undefined ||
    settings.eatOverlayEnabled !== undefined ||
    settings.eatConfidenceThreshold !== undefined
  );
}

/**
 * Concatenate multiple ArrayBuffers with delimiters.
 */
function concatenateBuffers(buffers: ArrayBuffer[], delimiter: Uint8Array): ArrayBuffer {
  // Calculate total size
  let totalSize = 0;
  for (let i = 0; i < buffers.length; i++) {
    totalSize += buffers[i].byteLength;
    if (i < buffers.length - 1) {
      totalSize += delimiter.length;
    }
  }

  // Create output buffer
  const result = new Uint8Array(totalSize);
  let offset = 0;

  for (let i = 0; i < buffers.length; i++) {
    result.set(new Uint8Array(buffers[i]), offset);
    offset += buffers[i].byteLength;

    if (i < buffers.length - 1) {
      result.set(delimiter, offset);
      offset += delimiter.length;
    }
  }

  return result.buffer;
}

export interface CreateBundleOptions {
  /**
   * Include persisted settings in the bundle. Adds a 4th part on its own, or fills the
   * settings slot of a 5-part bundle when statistics are also included (see the module
   * doc above for the zero-byte placeholder rule when statistics are included without
   * settings).
   */
  includeSettings?: boolean;
  /** Persisted settings to include (required if includeSettings is true) */
  settings?: BundleSettings;
  /**
   * Include `data.statistics` as the 5th part. Defaults to true. Pass false when the exported
   * data is a subset of what the statistics were scored on — whole-dataset scores attached to a
   * slice read as describing the slice.
   */
  includeStatistics?: boolean;
}

/**
 * Create a .parquetbundle ArrayBuffer from VisualizationData.
 *
 * @param data - The visualization data to export
 * @param options - Options for bundle creation
 * @returns ArrayBuffer containing the parquetbundle
 */
export function createParquetBundle(
  data: VisualizationData,
  options: CreateBundleOptions = {},
): ArrayBuffer {
  const { includeSettings = false, settings, includeStatistics = true } = options;

  // Create the three required parts
  const annotationsBuffer = createAnnotationsParquet(data);
  const metadataBuffer = createProjectionsMetadataParquet(data);
  const projectionsBuffer = createProjectionsDataParquet(data);

  const buffers: ArrayBuffer[] = [annotationsBuffer, metadataBuffer, projectionsBuffer];

  const settingsBuffer =
    includeSettings && hasBundleSettings(settings) ? createSettingsParquet(settings) : null;
  const statistics = includeStatistics ? (data.statistics ?? []) : [];

  if (statistics.length > 0) {
    // Part order is fixed, so a bundle with statistics but no settings still needs the 4th slot —
    // a zero-byte placeholder, exactly what the Python writer emits.
    buffers.push(settingsBuffer ?? new ArrayBuffer(0), createStatisticsParquet(statistics));
  } else if (settingsBuffer) {
    buffers.push(settingsBuffer);
  }

  return concatenateBuffers(buffers, BUNDLE_DELIMITER_BYTES);
}

/**
 * Export a .parquetbundle file by triggering a download.
 *
 * @param data - The visualization data to export
 * @param filename - The filename for the download (should end in .parquetbundle)
 * @param options - Options for bundle creation
 */
export function exportParquetBundle(
  data: VisualizationData,
  filename: string,
  options: CreateBundleOptions = {},
): void {
  const buffer = createParquetBundle(data, options);
  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.parquetbundle') ? filename : `${filename}.parquetbundle`;
  link.click();

  URL.revokeObjectURL(url);
}

/**
 * Generate a filename for the exported bundle.
 *
 * @param includeSettings - Whether settings are included
 * @returns Generated filename
 */
export function generateBundleFilename(includeSettings: boolean = false): string {
  const date = new Date().toISOString().split('T')[0];
  const suffix = includeSettings ? '_with_settings' : '';
  return `protspace${suffix}_${date}.parquetbundle`;
}
