# protspace-prep

FastAPI service that turns an uploaded FASTA file into a `.parquetbundle`. It backs the "drop a
FASTA" path in the ProtSpace web app: the browser POSTs the file here, follows job progress over
Server-Sent Events, then downloads the finished bundle and opens it in the explorer.

Endpoints:

| Method | Path                       | Purpose                                                 |
| ------ | -------------------------- | ------------------------------------------------------- |
| `POST` | `/api/prepare`             | Upload + validate a FASTA, enqueue a job (rate-limited) |
| `GET`  | `/api/prepare/{id}/events` | SSE progress stream for a job                           |
| `GET`  | `/api/prepare/{id}/bundle` | Download the produced `.parquetbundle`                  |
| `GET`  | `/healthz`                 | Liveness probe + current job counts                     |

Internally each job shells out to the [`protspace` CLI](https://github.com/tsenoner/protspace/tree/main/apps/protspace)
(`embed → project → annotate → bundle`). The service is not published — it is deployed from this
repo. See the [user-facing docs](https://protspace.app/docs/explore/importing-data) for the
browser side of the flow.

## Run locally

```bash
cd apps/prep
uv venv
uv pip install -e ".[dev]"
uv run uvicorn protspace_prep.app:app --reload --port 8000
```

## Tests

```bash
uv run pytest -q
```

## Build the Docker image

```bash
docker build -t protspace-prep:local .
```

## Configuration

All knobs are env vars, read once at startup by `load_settings()` in
`src/protspace_prep/config.py`.

| Variable                           | Default                        | Meaning                                                                  |
| ---------------------------------- | ------------------------------ | ------------------------------------------------------------------------ |
| `PREP_JOB_ROOT`                    | `/var/lib/protspace-prep/jobs` | Where job directories live.                                              |
| `PREP_MAX_CONCURRENT_JOBS`         | `5`                            | Active-job semaphore size.                                               |
| `PREP_MAX_PENDING_JOBS`            | `50`                           | Queue depth before new submissions are rejected.                         |
| `PREP_BUNDLE_TTL_SECONDS`          | `3600`                         | Bundle deletion deadline.                                                |
| `PREP_SWEEP_INTERVAL_SECONDS`      | `300`                          | How often expired job directories are reclaimed.                         |
| `PREP_UPLOAD_MAX_BYTES`            | `8388608`                      | Max FASTA upload size (8 MB).                                            |
| `PREP_SEQUENCE_MIN_COUNT`          | `20`                           | Min sequences per FASTA.                                                 |
| `PREP_SEQUENCE_MAX_COUNT`          | `1500`                         | Max sequences per FASTA.                                                 |
| `PREP_SEQUENCE_MAX_RESIDUES`       | `2000`                         | Max residues per sequence.                                               |
| `PREP_SEQUENCE_MAX_TOTAL_RESIDUES` | `1500000`                      | Max residues summed across the whole file.                               |
| `PREP_EMBEDDER`                    | `prot_t5`                      | Biocentral embedder model.                                               |
| `PREP_METHODS`                     | `pca2,umap2`                   | Projections to compute.                                                  |
| `PREP_ANNOTATIONS`                 | `default`                      | Annotation group.                                                        |
| `PREP_PIPELINE_TIMEOUT_SECONDS`    | `420`                          | Watchdog: kills the subprocess and surfaces a timeout error if exceeded. |
| `PREP_RATE_LIMIT`                  | `5/15minutes`                  | Per-client limit applied to `POST /api/prepare`.                         |
| `CORS_ALLOWED_ORIGIN`              | _(empty)_                      | Comma-separated allowed origins; empty allows none.                      |
| `PREP_LOG_LEVEL`                   | `INFO`                         | Log level.                                                               |
| `PREP_LOG_JSON_FORMAT`             | `false`                        | Emit structured JSON logs instead of plain text.                         |

## Known limitations

- The `JobRegistry` is in-memory. A container restart loses live job state:
  job directories survive on the volume, but `_jobs` is empty, so `/bundle`
  returns 404 for pre-restart jobs until the sweeper reclaims the directories.
