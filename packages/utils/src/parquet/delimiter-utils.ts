/**
 * Utilities for finding and counting delimiters in parquetbundle files.
 * These are shared between the bundle reader (core) and bundle writer (utils).
 */

import { BUNDLE_DELIMITER, BUNDLE_DELIMITER_BYTES } from './constants';

/**
 * Find all positions of the bundle delimiter in a Uint8Array.
 *
 * @param uint8Array - The binary data to search
 * @param limit - Stop after this many matches (callers that only need "is there one"
 *   pass 1 and avoid a full pass over hundreds of MB)
 * @returns Array of byte positions where delimiters start
 */
export function findBundleDelimiterPositions(uint8Array: Uint8Array, limit = Infinity): number[] {
  const positions: number[] = [];
  const len = BUNDLE_DELIMITER_BYTES.length;

  for (let i = 0; i <= uint8Array.length - len; i++) {
    let match = true;
    for (let j = 0; j < len; j++) {
      if (uint8Array[i + j] !== BUNDLE_DELIMITER_BYTES[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      positions.push(i);
      if (positions.length >= limit) break;
    }
  }

  return positions;
}

/**
 * Guard: a serialized part must not contain the bundle delimiter.
 *
 * The delimiter is in-band with no escaping, so a part whose bytes happen to
 * contain it would be split into two on read-back. Fail loudly at write time
 * rather than emit a bundle that decodes into the wrong shape.
 *
 * Mirrors `_check_no_delimiter` in the Python producer
 * (`apps/protspace/src/protspace/data/io/bundle.py`) — both sides must enforce
 * this or the format's invariants hold only in one direction.
 *
 * @param arrayBuffer - The serialized part to check
 * @param partName - Which part this is, so the message points at the offending data
 * @throws If the part contains the reserved delimiter byte string
 */
export function assertNoBundleDelimiter(arrayBuffer: ArrayBuffer, partName = 'parquet'): void {
  if (isParquetBundle(arrayBuffer)) {
    throw new Error(
      `Serialized ${partName} part contains the bundle delimiter "${BUNDLE_DELIMITER}"; ` +
        'a value includes this reserved byte string and would corrupt the bundle on read.',
    );
  }
}

/**
 * Check if an ArrayBuffer contains the bundle delimiter.
 *
 * @param arrayBuffer - The binary data to check
 * @returns true if at least one delimiter is found
 */
export function isParquetBundle(arrayBuffer: ArrayBuffer): boolean {
  const uint8Array = new Uint8Array(arrayBuffer);
  return findBundleDelimiterPositions(uint8Array, 1).length > 0;
}

/**
 * Count the number of delimiters in a Uint8Array.
 * Useful for validating bundle structure in tests.
 *
 * @param uint8Array - The binary data to search
 * @returns Number of delimiters found
 */
export function countBundleDelimiters(uint8Array: Uint8Array): number {
  return findBundleDelimiterPositions(uint8Array).length;
}
