import type { DataErrorEventDetail, DataLoader, ProtspaceScatterplot } from '@protspace/core';

type Args = {
  plotElement: ProtspaceScatterplot;
  dataLoader: DataLoader;
};

type PerfDatasetFailure = {
  datasetId: string;
  error: string;
};

type PerfSuiteResult = {
  createdAt: string;
  iterations: number;
  results: unknown[];
  // Datasets that threw, kept OUT of `results` so that array stays homogeneous:
  // plot_perf_results.py yields every entry of `results` as a dataset payload,
  // so a failure record in there would plot as a phantom dataset with empty bars.
  failures: PerfDatasetFailure[];
};

type PerfSuiteGlobalState = typeof globalThis & {
  __protspaceWebglPerfSuiteInFlight?: boolean;
  __protspaceWebglPerfSuiteConsumed?: boolean;
};

type HeapSample = {
  usedBytes: number | null;
  totalBytes: number | null;
  limitBytes: number | null;
};

type LoadMetrics = {
  datasetId: string;
  loadDurationMs: number;
  heapBefore: HeapSample;
  heapAfterLoad: HeapSample;
  heapSteady: HeapSample;
  peakUsedDuringLoadBytes: number | null;
};

const PERF_OVERLAY_ID = 'webgl-perf-suite-overlay';
const PERF_OVERLAY_STYLE_ID = 'webgl-perf-suite-overlay-style';

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function timeoutError(timeoutMs: number, what: string): Error {
  return new Error(`perf: timed out after ${timeoutMs}ms waiting for ${what}`);
}

async function waitUntil(
  predicate: () => boolean,
  timeoutMs: number,
  what: string,
  intervalMs = 250,
): Promise<void> {
  const start = performance.now();
  while (performance.now() - start < timeoutMs) {
    if (predicate()) return;
    await sleep(intervalMs);
  }
  throw timeoutError(timeoutMs, what);
}

/** Reject at `timeoutMs` if `promise` has not settled by then. */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, what: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(timeoutError(timeoutMs, what)), timeoutMs);
  });
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}

function readHeap(): HeapSample {
  const mem = (
    performance as unknown as {
      memory?: { usedJSHeapSize?: number; totalJSHeapSize?: number; jsHeapSizeLimit?: number };
    }
  ).memory;
  return {
    usedBytes: typeof mem?.usedJSHeapSize === 'number' ? mem.usedJSHeapSize : null,
    totalBytes: typeof mem?.totalJSHeapSize === 'number' ? mem.totalJSHeapSize : null,
    limitBytes: typeof mem?.jsHeapSizeLimit === 'number' ? mem.jsHeapSizeLimit : null,
  };
}

async function readDatasetList(): Promise<string[]> {
  const fallback = [
    '5K',
    '40K',
    '7K_toxprot',
    '35K_ec_brenda',
    '105K_homoSapiens_drosophilaMelanogaster',
    '127K_beta_lactamase',
    '573K_swissprot',
    'beta_lactamase_ec',
    'beta_lactamase_pn',
    'phosphatase',
  ];

  try {
    const res = await fetch('/data/datasets.json', { cache: 'no-store' });
    if (!res.ok) return fallback;
    const payload = (await res.json()) as unknown;
    if (!Array.isArray(payload)) return fallback;
    const ids = payload.filter((v) => typeof v === 'string' && v.length > 0) as string[];
    return ids.length ? ids : fallback;
  } catch {
    return fallback;
  }
}

async function resolveDatasetList(params: URLSearchParams): Promise<string[]> {
  const raw = params.get('webglPerfDatasets');
  if (raw && raw.length > 0) {
    const ids = raw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (ids.length > 0) return ids;
  }
  return readDatasetList();
}

function downloadJson(filename: string, payload: unknown) {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function ensurePerfOverlayStyles() {
  if (document.getElementById(PERF_OVERLAY_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = PERF_OVERLAY_STYLE_ID;
  style.textContent = `
    #${PERF_OVERLAY_ID} {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.86);
      z-index: 99999;
      font-family: system-ui, -apple-system, sans-serif;
    }

    #${PERF_OVERLAY_ID} .perf-suite-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.6rem;
      padding: 1.5rem 2rem;
      border-radius: 16px;
      background: #ffffff;
      box-shadow: 0 14px 40px rgba(15, 23, 42, 0.18);
      text-align: center;
    }

    #${PERF_OVERLAY_ID} .perf-suite-spinner {
      width: 44px;
      height: 44px;
      border: 3px solid rgba(59, 130, 246, 0.2);
      border-top-color: #3b82f6;
      border-radius: 999px;
      animation: perf-suite-spin 1s linear infinite;
    }

    #${PERF_OVERLAY_ID} .perf-suite-title {
      font-size: 1rem;
      font-weight: 600;
      color: #0f172a;
    }

    #${PERF_OVERLAY_ID} .perf-suite-subtitle {
      font-size: 0.875rem;
      color: #475569;
      max-width: 360px;
    }

    @keyframes perf-suite-spin {
      to {
        transform: rotate(360deg);
      }
    }
  `;
  document.head.appendChild(style);
}

function showPerfOverlay() {
  if (document.getElementById(PERF_OVERLAY_ID)) return;
  ensurePerfOverlayStyles();
  const overlay = document.createElement('div');
  overlay.id = PERF_OVERLAY_ID;
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'polite');
  overlay.innerHTML = `
    <div class="perf-suite-card">
      <div class="perf-suite-spinner" aria-hidden="true"></div>
      <div class="perf-suite-title">Performance metrics are being gathered</div>
      <div class="perf-suite-subtitle">This might take a couple of minutes.</div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function hidePerfOverlay() {
  document.getElementById(PERF_OVERLAY_ID)?.remove();
}

async function loadDataset(args: Args, datasetId: string, timeoutMs: number): Promise<LoadMetrics> {
  const url = `/data/${datasetId}.parquetbundle`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`perf: failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const file = new File([arrayBuffer], `${datasetId}.parquetbundle`, {
    type: 'application/octet-stream',
  });

  // Settle briefly then capture baseline heap
  await sleep(50);
  const heapBefore = readHeap();

  // Best-effort polling loop to track peak heap during load
  let polling = true;
  let peakUsedDuringLoadBytes: number | null = null;

  const pollLoop = (async () => {
    while (polling) {
      const sample = readHeap();
      if (sample.usedBytes !== null) {
        if (peakUsedDuringLoadBytes === null || sample.usedBytes > peakUsedDuringLoadBytes) {
          peakUsedDuringLoadBytes = sample.usedBytes;
        }
      }
      await sleep(50);
    }
  })();

  // Registered here, next to the call that triggers them, and torn down together
  // in the finally below: `{ once: true }` detaches a listener only when it
  // actually fires, so on a healthy dataset the `data-error` one would outlive
  // the load and accumulate across every dataset in the sweep.
  const listeners = new AbortController();
  const listenerOpts = { once: true, signal: listeners.signal };

  const dataChange = new Promise<void>((resolve) => {
    args.plotElement.addEventListener('data-change', () => resolve(), listenerOpts);
  });

  const loaderDone = new Promise<void>((resolve, reject) => {
    args.dataLoader.addEventListener('data-loaded', () => resolve(), listenerOpts);
    args.dataLoader.addEventListener(
      'data-error',
      (event: Event) => {
        const detail = (event as CustomEvent<DataErrorEventDetail>).detail;
        reject(new Error(String(detail?.message ?? 'unknown error')));
      },
      listenerOpts,
    );
  });
  // `data-error` fires while we are still awaiting loadFromFile, one await
  // ahead of where `loaderDone` is consumed, so its rejection would reach a
  // microtask checkpoint unhandled and surface as a page-level unhandled
  // rejection. Attaching a no-op handler marks it handled without consuming it:
  // the await below still observes the rejection and reports the dataset.
  loaderDone.catch(() => {});

  const t0 = performance.now();
  let loadDurationMs: number;
  try {
    // Every wait below is bounded on its own deadline rather than inheriting an
    // enclosing one: the loader path has several ways to settle nothing at all —
    // dataset-controller swallows finalization errors, and `loadFromFile`
    // resolves rather than rejects once a load handler is installed — so an
    // unbounded await surfaces only as Playwright's terminal "waiting for event
    // download" tens of minutes later, naming neither dataset nor condition.
    await withTimeout(args.dataLoader.loadFromFile(file), timeoutMs, `${datasetId} to load`);
    await withTimeout(loaderDone, timeoutMs, `${datasetId} data-loaded`);
    await withTimeout(dataChange, timeoutMs, `${datasetId} data-change`);

    await waitUntil(
      () => !!args.plotElement.data?.protein_ids?.length,
      timeoutMs,
      `${datasetId} protein_ids on the plot`,
    );
    await waitUntil(
      () => !document.getElementById('progressive-loading'),
      timeoutMs,
      `${datasetId} progressive-loading overlay to clear`,
    );

    loadDurationMs = performance.now() - t0;
  } finally {
    listeners.abort();
    // Stop the heap poller on the failure path too, or it outlives this dataset
    // and keeps sampling through every subsequent one.
    polling = false;
    await pollLoop;
  }

  const heapAfterLoad = readHeap();
  await sleep(300);
  const heapSteady = readHeap();

  return {
    datasetId,
    loadDurationMs,
    heapBefore,
    heapAfterLoad,
    heapSteady,
    peakUsedDuringLoadBytes,
  };
}

export async function maybeRunWebglPerfSuite(args: Args): Promise<boolean> {
  const params = new URLSearchParams(window.location.search);
  if (params.get('webglPerf') !== '1') return false;

  const g = globalThis as PerfSuiteGlobalState;
  if (g.__protspaceWebglPerfSuiteInFlight || g.__protspaceWebglPerfSuiteConsumed) return true;
  g.__protspaceWebglPerfSuiteInFlight = true;
  showPerfOverlay();

  const iterations = (() => {
    const raw = params.get('webglPerfIterations');
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 10;
  })();

  let success = false;
  try {
    const datasets = await resolveDatasetList(params);
    const timeoutMs = 12 * 60_000;
    const createdAt = new Date().toISOString();
    const results: unknown[] = [];
    const failures: PerfDatasetFailure[] = [];

    for (const datasetId of datasets) {
      // Per dataset, so one failure costs its own results and nothing else. The
      // run is a sweep over increasingly large bundles looking for the point at
      // which rendering gives out; the dataset that finds it is expected to
      // fail, and losing every smaller dataset's measurements with it would
      // discard exactly the data the sweep exists to collect.
      try {
        const loadMetrics = await loadDataset(args, datasetId, timeoutMs);

        const result = await args.plotElement.runWebGLRenderPerfMeasurements(iterations, {
          download: false,
          dataset: { id: datasetId, url: `/data/${datasetId}.parquetbundle` },
        });
        if (!result) {
          throw new Error(`perf: no result for dataset ${datasetId}`);
        }
        results.push({ ...(result as Record<string, unknown>), load: loadMetrics });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`perf: dataset ${datasetId} failed:`, error);
        failures.push({ datasetId, error: message });
      }
    }

    // Nothing measured is a failed run, not a results file full of nothing —
    // emitting one would let the spec's download arrive and read as green.
    if (results.length === 0) {
      throw new Error(
        `perf: no dataset produced measurements (${datasets.length} attempted): ` +
          failures.map((f) => `${f.datasetId}: ${f.error}`).join('; '),
      );
    }

    const suite: PerfSuiteResult = {
      createdAt,
      iterations,
      results,
      failures,
    };

    const safeCreatedAt = createdAt.split(':').join('-');
    downloadJson(`protspace-webgl-perf-suite-${safeCreatedAt}.json`, suite);
    success = true;
  } finally {
    g.__protspaceWebglPerfSuiteInFlight = false;
    if (success) g.__protspaceWebglPerfSuiteConsumed = true;
    hidePerfOverlay();
  }

  return true;
}
