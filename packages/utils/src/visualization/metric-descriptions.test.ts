import { describe, it, expect } from 'vitest';
import { metricDescription } from './metric-descriptions';

describe('metricDescription', () => {
  it('describes every metric the panel can display', () => {
    // Not "every metric the backend emits" (there are ten): annotationStatSummary only ever
    // builds rows from two stat families, annotation_validity (silhouette, Davies-Bouldin,
    // Calinski-Harabasz) and cluster_agreement (ARI, NMI), at annotation-statistics.ts:155 and
    // :161. Faithfulness metrics live in a different family and n_clusters is filtered out as
    // `metric_kind === 'meta'` (annotation-statistics.ts:129), so none of the other five can
    // ever reach `_renderStatMetric`.
    for (const metric of [
      'silhouette',
      'davies_bouldin',
      'calinski_harabasz',
      'adjusted_rand',
      'normalized_mutual_info',
    ]) {
      expect(metricDescription(metric).length).toBeGreaterThan(20);
    }
  });

  it('returns an empty string for an unknown metric', () => {
    // A newer backend metric must render without a popover, not with an empty one.
    expect(metricDescription('some_future_metric')).toBe('');
  });
});
