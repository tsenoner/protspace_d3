import numpy as np
import pytest

from protspace.stats.base import StatContext, StatRow
from protspace.stats.metrics.annotation_validity import AnnotationValidityStatistic


def _blobs(n=200, centers=4, dim=2, seed=1):
    from sklearn.datasets import make_blobs

    X, y = make_blobs(n_samples=n, centers=centers, n_features=dim, random_state=seed)
    return X, y


def test_scores_each_annotation_on_ctx_coords():
    X, y = _blobs(n=200, centers=4, dim=2, seed=3)
    ids = [f"p{i}" for i in range(200)]
    ann = {"grp": {pid: f"g{int(c)}" for pid, c in zip(ids, y, strict=True)}}
    outs = AnnotationValidityStatistic().compute(
        StatContext("projection", "PCA_2", coords=X, ids=ids, annotations=ann)
    )
    by_metric = {r.metric: r for r in outs if isinstance(r, StatRow)}
    assert {"silhouette", "davies_bouldin", "calinski_harabasz"} <= set(by_metric)
    s = by_metric["silhouette"]
    assert s.stat_family == "annotation_validity"
    assert s.annotation == "grp" and s.label_kind == "annotation"
    assert 0.4 < s.value <= 1.0  # well-separated blobs → high silhouette


def test_space_kind_is_taken_from_context():
    X, y = _blobs(n=120, centers=3, dim=8, seed=4)
    ids = [f"p{i}" for i in range(120)]
    ann = {"grp": {pid: f"g{int(c)}" for pid, c in zip(ids, y, strict=True)}}
    outs = AnnotationValidityStatistic().compute(
        StatContext("embedding", "prot_t5", coords=X, ids=ids, annotations=ann)
    )
    assert all(r.space_kind == "embedding" for r in outs)
    assert all(r.space_name == "prot_t5" for r in outs)


def test_missing_annotation_values_excluded():
    X, y = _blobs(n=100, centers=2, dim=2, seed=5)
    ids = [f"p{i}" for i in range(100)]
    # Only half the proteins have a category → the rest are dropped from scoring.
    ann = {"grp": {pid: f"g{int(c)}" for pid, c in list(zip(ids, y, strict=True))[:50]}}
    outs = AnnotationValidityStatistic().compute(
        StatContext("projection", "P", coords=X, ids=ids, annotations=ann)
    )
    sil = next(r for r in outs if r.metric == "silhouette")
    assert sil.extra["n_labels"] == 50


def test_single_category_annotation_emits_nothing():
    X, _ = _blobs(n=80, centers=1, dim=2, seed=6)
    ids = [f"p{i}" for i in range(80)]
    ann = {"grp": dict.fromkeys(ids, "only")}  # 1 category
    outs = AnnotationValidityStatistic().compute(
        StatContext("projection", "P", coords=X, ids=ids, annotations=ann)
    )
    assert outs == []


def test_no_annotations_returns_empty():
    X, _ = _blobs(n=50, centers=2, dim=2, seed=7)
    outs = AnnotationValidityStatistic().compute(
        StatContext("projection", "P", coords=X, ids=[f"p{i}" for i in range(50)])
    )
    assert outs == []


def test_subsample_path_flags_sampled_and_is_deterministic():
    """When n exceeds ``sample_threshold`` the shared subsample kicks in: the
    emitted silhouette row must report ``sampled=True`` and ``n_labels`` equal to
    the threshold (not the full n), and repeating the identical call must
    reproduce the exact same value (deterministic rng_seed-based subsample)."""
    threshold = 30
    X, y = _blobs(n=200, centers=4, dim=2, seed=9)
    ids = [f"p{i}" for i in range(200)]
    ann = {"grp": {pid: f"g{int(c)}" for pid, c in zip(ids, y, strict=True)}}

    def _run():
        outs = AnnotationValidityStatistic().compute(
            StatContext(
                "projection",
                "P",
                coords=X,
                ids=ids,
                annotations=ann,
                params={"sample_threshold": threshold},
            )
        )
        return next(r for r in outs if r.metric == "silhouette")

    sil = _run()
    assert sil.extra["sampled"] is True
    assert sil.extra["n_labels"] == threshold

    sil_again = _run()
    assert sil_again.value == sil.value
    assert sil_again.extra == sil.extra


def test_per_category_silhouette_averages_to_the_aggregate():
    # UNBALANCED category sizes on purpose: silhouette_score(X, y) is defined
    # as silhouette_samples(X, y).mean(), a mean over POINTS, not categories.
    # The per-category rows are per-CATEGORY means, so recovering the
    # aggregate from them requires weighting each part by its category size.
    # A balanced fixture makes the unweighted and size-weighted means
    # coincide and cannot tell the two apart.
    from sklearn.datasets import make_blobs

    sizes = [120, 50, 20, 10]
    X, y = make_blobs(n_samples=sizes, n_features=2, random_state=3)
    ids = [f"p{i}" for i in range(len(y))]
    ann = {"grp": {pid: f"g{int(c)}" for pid, c in zip(ids, y, strict=True)}}
    outs = AnnotationValidityStatistic().compute(
        StatContext("projection", "PCA_2", coords=X, ids=ids, annotations=ann)
    )
    aggregate = next(
        r for r in outs if r.metric == "silhouette" and r.category is None
    )
    per_cat = [r for r in outs if r.metric == "silhouette" and r.category is not None]

    assert len(per_cat) == 4
    assert {r.category for r in per_cat} == {"g0", "g1", "g2", "g3"}
    labels, counts = np.unique(y, return_counts=True)
    cat_size = {f"g{int(c)}": int(n) for c, n in zip(labels, counts, strict=True)}
    total = len(y)
    weighted_mean = sum(cat_size[r.category] * r.value for r in per_cat) / total
    assert weighted_mean == pytest.approx(aggregate.value)


def test_per_category_davies_bouldin_averages_to_the_aggregate():
    # Same unbalanced fixture as the silhouette test above. Unlike silhouette,
    # scikit-learn's davies_bouldin_score really is the unweighted mean of the
    # per-cluster R_i values, so the plain mean is the correct identity here;
    # exercising it on unbalanced categories is a strictly stronger check than
    # a balanced fixture, since it also rules out an accidental match.
    from sklearn.datasets import make_blobs

    sizes = [120, 50, 20, 10]
    X, y = make_blobs(n_samples=sizes, n_features=2, random_state=3)
    ids = [f"p{i}" for i in range(len(y))]
    ann = {"grp": {pid: f"g{int(c)}" for pid, c in zip(ids, y, strict=True)}}
    outs = AnnotationValidityStatistic().compute(
        StatContext("projection", "PCA_2", coords=X, ids=ids, annotations=ann)
    )
    aggregate = next(
        r for r in outs if r.metric == "davies_bouldin" and r.category is None
    )
    per_cat = [
        r for r in outs if r.metric == "davies_bouldin" and r.category is not None
    ]

    assert len(per_cat) == 4
    assert {r.category for r in per_cat} == {"g0", "g1", "g2", "g3"}
    assert np.mean([r.value for r in per_cat]) == pytest.approx(aggregate.value)


def test_calinski_harabasz_stays_aggregate_only():
    # CH is a global variance ratio with no accepted per-cluster form.
    X, y = _blobs(n=200, centers=4, dim=2, seed=3)
    ids = [f"p{i}" for i in range(200)]
    ann = {"grp": {pid: f"g{int(c)}" for pid, c in zip(ids, y, strict=True)}}
    outs = AnnotationValidityStatistic().compute(
        StatContext("projection", "PCA_2", coords=X, ids=ids, annotations=ann)
    )
    ch = [r for r in outs if r.metric == "calinski_harabasz"]
    assert len(ch) == 1
    assert ch[0].category is None


def test_per_category_rows_are_emitted_for_the_embedding_pass_too():
    X, y = _blobs(n=120, centers=3, dim=8, seed=4)
    ids = [f"p{i}" for i in range(120)]
    ann = {"grp": {pid: f"g{int(c)}" for pid, c in zip(ids, y, strict=True)}}
    outs = AnnotationValidityStatistic().compute(
        StatContext("embedding", "prot_t5", coords=X, ids=ids, annotations=ann)
    )
    per_cat = [r for r in outs if r.category is not None]
    assert per_cat
    assert all(r.space_kind == "embedding" for r in per_cat)


def test_singleton_category_emits_no_davies_bouldin_at_all():
    # DBI is unstable with a singleton cluster, so neither the aggregate nor the
    # per-category rows may appear; otherwise the mean invariant would compare a
    # present aggregate against an incomplete set of parts.
    X, _ = _blobs(n=60, centers=2, dim=2, seed=7)
    ids = [f"p{i}" for i in range(60)]
    cats = ["a"] * 30 + ["b"] * 29 + ["lonely"]
    ann = {"grp": dict(zip(ids, cats, strict=True))}
    outs = AnnotationValidityStatistic().compute(
        StatContext("projection", "P", coords=X, ids=ids, annotations=ann)
    )
    assert [r for r in outs if r.metric == "davies_bouldin"] == []
    assert [r for r in outs if r.metric == "silhouette"]


def test_category_is_written_to_the_arrow_table():
    from protspace.stats.base import StatsReport

    report = StatsReport()
    report.add(
        [
            StatRow(
                space_kind="projection",
                space_name="P",
                annotation="grp",
                stat_family="annotation_validity",
                label_kind="annotation",
                metric="silhouette",
                metric_kind="validity",
                value=0.5,
                category="g0",
            )
        ]
    )
    table = report.to_arrow()
    assert "category" in table.column_names
    assert table.column("category").to_pylist() == ["g0"]


def test_subsample_is_row_order_invariant():
    """The id-canonical subsample must pick the SAME proteins regardless of input
    row order, so the score is identical when the same points are shuffled. A
    positional (row-order) draw would select a different subset and drift — the
    guarantee the determinism-by-identical-call test above cannot catch."""
    threshold = 30
    X, y = _blobs(n=200, centers=4, dim=2, seed=9)
    ids = [f"p{i}" for i in range(200)]
    ann = {"grp": {pid: f"g{int(c)}" for pid, c in zip(ids, y, strict=True)}}

    def _sil(coords, order_ids):
        outs = AnnotationValidityStatistic().compute(
            StatContext(
                "projection",
                "P",
                coords=coords,
                ids=order_ids,
                annotations=ann,
                params={"sample_threshold": threshold},
            )
        )
        return next(r for r in outs if r.metric == "silhouette").value

    base = _sil(X, ids)
    perm = np.random.default_rng(0).permutation(200)
    shuffled = _sil(X[perm], [ids[i] for i in perm])
    assert shuffled == base  # same proteins sampled despite the reordering
