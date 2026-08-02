"""Annotation-based cluster-validity: how well an annotation's categories
separate in a given space (embedding or projection).

silhouette / Davies-Bouldin / Calinski-Harabasz are computed with the
annotation's category labels (not auto-KMeans labels), on ``ctx.coords``.
silhouette and Davies-Bouldin are additionally emitted per category (rows
carrying ``category``). The silhouette aggregate is the size-weighted mean
of its per-category parts (a mean over points, not categories); the
Davies-Bouldin aggregate is the unweighted mean of its per-cluster values.
Calinski-Harabasz stays aggregate-only. scikit-learn imports are function-local.
"""

from __future__ import annotations

import numpy as np

from protspace.stats._sampling import id_seed, sorted_subsample
from protspace.stats.base import DEFAULT_SAMPLE_THRESHOLD, StatContext, StatRow


def _per_category_silhouette(
    sample_values: np.ndarray, labels: np.ndarray, cat_names: list[str]
) -> dict[str, float]:
    """Mean silhouette per category.

    ``silhouette_score`` is defined as ``silhouette_samples(...).mean()``, so the
    aggregate is exactly the mean of these values and no extra work is done: the
    per-point array is retained instead of being collapsed and discarded.
    """
    return {
        name: float(sample_values[labels == j].mean())
        for j, name in enumerate(cat_names)
    }


def _per_category_davies_bouldin(
    Xa: np.ndarray, labels: np.ndarray, cat_names: list[str]
) -> dict[str, float]:
    """Per-cluster Davies-Bouldin ``R_i``: overlap with the single worst rival.

    ``R_i = max over j != i of (s_i + s_j) / ||c_i - c_j||`` for centroids ``c``
    and mean intra-cluster distances ``s``. scikit-learn's ``davies_bouldin_score``
    is the mean of exactly these, and exposes only that mean.
    """
    from sklearn.metrics import pairwise_distances

    k = len(cat_names)
    centroids = np.array([Xa[labels == j].mean(axis=0) for j in range(k)])
    intra = np.array(
        [
            float(np.linalg.norm(Xa[labels == j] - centroids[j], axis=1).mean())
            for j in range(k)
        ]
    )
    # k x k, not k x k x d: a broadcast (centroids[:, None] - centroids[None])
    # norm materialises a k x k x d tensor, which is unbounded on both axes (d is
    # the full pLM dim, k is unbounded for an explicit --stats-annotation).
    separation = pairwise_distances(centroids)
    # Mirrors sklearn: coincident centroids (and the whole diagonal) become inf so
    # their ratio is 0 and cannot win the row max. Without this the diagonal would
    # divide by zero and every score would be inf.
    separation[separation == 0] = np.inf
    per_cluster = ((intra[:, None] + intra[None, :]) / separation).max(axis=1)
    return {name: float(per_cluster[j]) for j, name in enumerate(cat_names)}


class AnnotationValidityStatistic:
    """silhouette / DBI / CH of each annotation's categories on ``ctx.coords``."""

    family = "annotation_validity"
    requires_embedding = False
    embedding_space = True  # also run by the driver's once-per-embedding pass

    def compute(self, ctx: StatContext) -> list[StatRow]:
        if not ctx.annotations:
            return []
        from sklearn.metrics import (
            calinski_harabasz_score,
            davies_bouldin_score,
        )

        coords = np.asarray(ctx.coords)
        threshold = int(ctx.params.get("sample_threshold", DEFAULT_SAMPLE_THRESHOLD))
        id_to_row = {pid: i for i, pid in enumerate(ctx.ids)}
        rows: list[StatRow] = []

        for name, mapping in ctx.annotations.items():
            # Annotated points present in this space, in canonical id order — so the
            # subsample below is reproducible and picks the *same* proteins across
            # spaces (embedding vs projection) whenever the annotated id-set matches;
            # otherwise the "separability ceiling" would compare two different draws.
            present = sorted(
                (pid, id_to_row[pid], cat)
                for pid, cat in mapping.items()
                if pid in id_to_row
            )
            if len(present) < 3 or len({c for _, _, c in present}) < 2:
                continue  # need >= 3 points, >= 2 categories

            # Bound cost: subsample (id-seeded) BEFORE gathering + upcasting, so at
            # 570k scale we materialise ~threshold float64 rows, not all of them
            # (label integers are arbitrary, so renumbering post-subsample is
            # metric-invariant). Shared across all three metrics.
            rng = np.random.default_rng(id_seed(ctx.rng_seed, [p[0] for p in present]))
            sub = sorted_subsample(len(present), threshold, rng)
            if sub is not None:
                present = [present[i] for i in sub]
            row_idx = [r for _, r, _ in present]
            cats = [c for _, _, c in present]
            cat_to_int = {c: j for j, c in enumerate(sorted(set(cats)))}
            Xa = np.asarray(coords[row_idx], dtype=float)
            labels = np.asarray([cat_to_int[c] for c in cats])
            n = Xa.shape[0]
            _, counts = np.unique(labels, return_counts=True)
            achieved = len(counts)
            if achieved < 2:  # a category vanished under subsampling
                continue
            base = {
                "space_kind": ctx.space_kind,
                "space_name": ctx.space_name,
                "annotation": name,
                "stat_family": self.family,
                "label_kind": "annotation",
            }
            extra = {
                "seed": ctx.rng_seed,
                "n_labels": int(n),
                "n_categories": int(achieved),
                "sampled": sub is not None,
            }

            cat_names = sorted(cat_to_int, key=cat_to_int.get)

            def _emit(metric_name: str, value: float, category: str | None = None):
                # extra/base are reassigned each outer-loop iteration, but _emit is
                # always called within the same iteration that defines it, before
                # the next reassignment, so the closure never sees a stale value.
                rows.append(
                    StatRow(
                        metric=metric_name,
                        metric_kind="validity",
                        value=float(value),
                        category=category,
                        extra=extra,  # noqa: B023
                        **base,  # noqa: B023
                    )
                )

            # silhouette needs 2 <= k <= n-1; DBI/CH are unstable with singletons.
            if 2 <= achieved <= n - 1:
                try:
                    from sklearn.metrics import silhouette_samples

                    samples = silhouette_samples(Xa, labels)
                    # Compute the parts BEFORE emitting the aggregate: if the
                    # decomposition raises, the except below must discard the
                    # whole attempt, not leave an aggregate row with zero parts.
                    per_cat = _per_category_silhouette(samples, labels, cat_names)
                    _emit("silhouette", samples.mean())
                    for cat, value in per_cat.items():
                        _emit("silhouette", value, cat)
                except Exception:  # noqa: BLE001 - best-effort
                    pass

            if not bool((counts < 2).any()):
                try:
                    # Same ordering constraint as the silhouette block above.
                    per_cat = _per_category_davies_bouldin(Xa, labels, cat_names)
                    _emit("davies_bouldin", davies_bouldin_score(Xa, labels))
                    for cat, value in per_cat.items():
                        _emit("davies_bouldin", value, cat)
                except Exception:  # noqa: BLE001 - best-effort
                    pass

                try:
                    # Aggregate only: CH is a global variance ratio with no
                    # accepted per-cluster decomposition.
                    _emit("calinski_harabasz", calinski_harabasz_score(Xa, labels))
                except Exception:  # noqa: BLE001 - best-effort
                    pass
        return rows
