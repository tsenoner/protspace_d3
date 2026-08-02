/**
 * One or two sentence explanations for the projection-quality metrics, shown behind the
 * ⓘ icon beside each number. Kept next to the metric display names rather than in the
 * component, so the panel and any future consumer describe a metric identically.
 *
 * Must cover the same keys as `METRIC_DISPLAY` in `annotation-statistics.ts`; nothing enforces
 * that automatically, so a metric added to one map needs the other too.
 */
const METRIC_DESCRIPTIONS: Record<string, string> = {
  silhouette:
    'How well each protein sits inside its own group rather than a neighbouring one, ' +
    'averaged. Runs from -1 to 1: above 0.5 is a clear separation, near 0 means the ' +
    'groups overlap, and below 0 means proteins are typically closer to another group.',
  davies_bouldin:
    'The average overlap between each group and the group it is most confusable with. ' +
    'Lower is better, and 0 would be perfect separation. It has no upper bound, so read ' +
    'it by comparing projections rather than against a fixed threshold.',
  calinski_harabasz:
    'The spread between groups divided by the spread within them. Higher is better. ' +
    'It has no upper bound and grows with dataset size, so compare it only across ' +
    'projections of the same data.',
  adjusted_rand:
    'How closely the automatic clustering reproduces this annotation, corrected for ' +
    'agreement that chance alone would produce. 1 is an exact match and 0 is no better ' +
    'than random.',
  normalized_mutual_info:
    'How much knowing the automatic cluster tells you about the annotation, on a 0 to 1 ' +
    'scale. Unlike ARI it is not corrected for chance, so it reads slightly higher.',
};

/** Explanation for a metric, or '' when there is none, which reads as "render no popover". */
export function metricDescription(metric: string): string {
  return METRIC_DESCRIPTIONS[metric] ?? '';
}
