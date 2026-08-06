# Separation Scores

Separation scores answer one question: **does this annotation actually form clusters in this projection?** A high score means proteins sharing an annotation value sit together and apart from the rest. A low score means the annotation cuts across the layout rather than explaining it.

They appear only for datasets prepared with statistics:

```bash
protspace prepare -i embeddings.h5 -m pca2,umap2 --stats -o output
```

Without `--stats` the bundle carries no statistics part, the legend shows no strips, and the metadata panel shows only the reduction's parameters. See [Data Preparation](/guide/data-preparation) for the full pipeline.

## Where They Appear

**Above the legend**, two strips place one dot per category on a shared axis, one strip for silhouette and one for Davies–Bouldin. Each dot carries its category's colour, so you can see at a glance whether an annotation separates uniformly or whether one group is dragging the average down. Hovering a dot marks the matching legend row, and hovering a legend row marks its dot. Either way, the number to the right of each axis reads out that category's exact value, so you get its silhouette and its Davies–Bouldin together rather than one at a time. It stays blank for a category a metric could not score: Davies–Bouldin has no value for a one-member category.

**In the projection metadata panel**, opened with the chart button at the top left of the plot, the Separation section carries the whole-annotation scores for all three metrics and names the annotation it was scored on. It comes first because it is the only section that changes when you recolour. Below it, Faithfulness to the embedding holds measures such as trustworthiness, which describe the layout itself and involve no annotation at all, and How it was made holds the reduction's own settings.

## The Three Metrics

| Metric            | Range    | Direction        | Reads as                                                                                                                          |
| ----------------- | -------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Silhouette        | -1 to 1  | Higher is better | Above 0.5 is clear separation, near 0 means the groups overlap, below 0 means proteins are typically closer to a different group. |
| Davies–Bouldin    | 0 upward | Lower is better  | The average overlap between each group and the group it is most confusable with. No upper bound.                                  |
| Calinski–Harabasz | 0 upward | Higher is better | The spread between groups divided by the spread within them. No upper bound, and it grows with dataset size.                      |

Only silhouette is on a fixed scale, so it is the one number that means the same thing across datasets. The other two have no upper bound: read them by comparing projections of the same data, not against a threshold.

Each metric also has an ⓘ popover in the panel with the same explanation, so you do not have to leave the page to interpret a number.

## Why Only Two Metrics Have Per-Category Scores

Silhouette and Davies–Bouldin both decompose. Silhouette is defined as an average over proteins, so grouping those per-protein values by category gives each category its own score. Davies–Bouldin is defined as an average over categories in the first place, and each category's term is its overlap with its single worst rival, so that term is the per-category score.

Calinski–Harabasz is a single global variance ratio with no accepted per-category form, so it appears in the panel only and has no strip.

## The "Embedding" Column

Beside each score in the panel is its value on the original high-dimensional embedding. That is the ceiling: how much separation genuinely exists before any projection, so you can tell "this annotation does not separate" from "this 2D layout lost the separation that was there".

A silhouette of 0.30 against an embedding value of 0.35 means the projection kept almost everything. The same 0.30 against 0.80 means the layout is hiding real structure, and another projection may show it better. Per-category ceilings appear in the strip tooltips.

## Categories With A Single Member

A category holding one protein has no spread: the protein is its own centre. Any separation score for it would describe its neighbours rather than itself, so single-member categories are left out. Their legend row shows a blank score cell and they get no dot on either strip.

Davies–Bouldin and Calinski–Harabasz are computed over the remaining categories, since both weight every category equally regardless of size and a single one-member category would otherwise take a full share of the average.

Silhouette is different in one respect worth knowing: its whole-annotation number still covers every protein, single-member categories included, because a lone protein's silhouette is defined as exactly 0 and contributes nothing to the average either way.

The practical effect shows up most on deep taxonomic ranks. Scoring a venom dataset by `class` gives 10 categories of which 2 hold one protein each, so those 2 are dropped and the other 8 score normally. By `family` the same dataset has 42 categories with 14 singletons, and a strip with 14 gaps in it is itself the useful signal: that annotation is too fine-grained for this dataset.

## Scores Cover The Whole Dataset

Scores are computed once, during preparation, over every protein. Hiding legend values or filtering the view does not recompute them, so the panel states "Computed on the full dataset".

Because a filtered view and a whole-dataset score would contradict each other on screen, the strips are replaced by "Separation scores are hidden while the view is filtered" whenever a filter is active. This includes the EAT reliability slider. Clear the filter and the strips return.

Above 5000 proteins the computation runs on a deterministic 5000-protein subsample, seeded from the protein identifiers, so the same dataset always produces the same scores.

## Cluster Annotations

Preparing with `--stats` also adds `cluster_elbow_*` and `cluster_silhouette_*` annotations, an automatic K-means grouping of the embedding. Selecting one shows an extra block: ARI and NMI, measuring how closely that automatic clustering reproduces each real annotation. It reads in the natural direction: this clustering, at this K, recovers this annotation at this ARI. Both are absent for ordinary annotations, where the comparison would not make sense.

These clusterings also carry their own separation scores, so the strips work on them exactly as on any annotation. Earlier versions instead attached each protein's own silhouette to its cluster value, so it showed up when you hovered that point in the plot. That was the only place in ProtSpace where a separation score was reported per protein rather than per group, and it is gone: a cluster is read through the strips, like every other annotation. Read those scores as descriptive rather than as a verdict, which is what the note under the strips warns about: K-means drew the boundaries being scored, in the very projection they are scored in, so it starts with an advantage no curated annotation has. A `cluster_silhouette_*` column goes further, since its K was chosen by maximising exactly the silhouette being reported. The per-category numbers are the part worth reading: they say which cluster is tight and which is mush, which the average cannot. The ARI and NMI block is the independent half, comparing the clustering against something it did not choose.

A clustering belongs to the projection it was found in, so its scores appear only while that projection is displayed. Selecting `cluster_elbow_ProtT5 — PCA 2` while viewing UMAP 2 shows the groups but no scores.

## Next Steps

- [Using the Legend](/explore/legend) - filtering, colours, and sorting by separation
- [Data Preparation](/guide/data-preparation) - preparing a dataset with `--stats`
