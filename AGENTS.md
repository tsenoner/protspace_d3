# Agent Instructions — protspace

Canonical instructions for **all** AI coding agents (Codex, Claude Code, Cursor, Copilot, etc.)
working in this repository. This file is the single source of truth; tool-specific files
(e.g. `.claude/CLAUDE.md`) import it.

## Spec-driven development with OpenSpec (default workflow)

This project uses [OpenSpec](https://openspec.dev/) for all non-trivial work. Plan the change
as a spec **before** writing implementation code.

- **Plan in OpenSpec, not elsewhere.** Proposals, design, spec deltas, and task lists live in
  `openspec/changes/<change-name>/`. Do **not** save plans, specs, or design docs under `docs/`,
  scratch files, or other ad-hoc locations.
- **Use the workflow commands/skills:**
  - `/opsx:propose <idea>` — create a change and generate its artifacts (proposal, design, specs, tasks)
  - `/opsx:apply` — implement the change's tasks
  - `/opsx:archive` — merge spec deltas into `openspec/specs/` and archive the change.
    Run it as the **last commit on the branch, before the merge** — see below.
  - `/opsx:explore` — investigate/clarify before committing to a change
  - If slash commands are unavailable, invoke the equivalent OpenSpec skill or run the `openspec` CLI directly.
- **`openspec/specs/` is the source of truth** for current behavior. Read the relevant specs
  before proposing a change.
- **Trivial changes** (typo, one-line fix, formatting, dependency bump) do not need a full
  proposal — use judgment.

### Archive before the merge, not after

`/opsx:archive` is what makes `openspec/specs/` true, so it belongs in the change rather than
after it: run it on the branch, commit the result, and let CI go green on that commit.
Deferred to "after the merge" it does not happen — the PR is closed and the branch is gone —
leaving `openspec/specs/` describing behavior the code no longer has, which the next change
reads as current.

Before archiving, tick off `tasks.md` including anything the review added, and reread
`proposal.md` / `design.md` against the final diff: rationale written before a review is
often stale by the end of it, and archiving freezes it.

One-time CLI setup is in [CONTRIBUTING.md](CONTRIBUTING.md#openspec-one-time-per-machine).

## Before committing

Always run `pnpm precommit` before creating any git commit. It is
`lint-staged && quality && docs:annotations:check && docs:build`:

- ESLint `--fix` and Prettier `--write`, on **staged files only** (lint-staged)
- TypeScript typecheck, Knip, and Knip dependency validation (`pnpm quality`)
- `docs:annotations:check`, the generated annotation reference must match the source
- `docs:build`, a full VitePress build (a dead internal link fails it)

**It runs no tests at all.** Run `pnpm test` yourself. `pnpm test:e2e` (below) and
`pnpm test:contract` are separate again.

It is JS-only; Python workspace members are covered by their own CI workflows (see below).

Note that lint-staged only inspects **staged** files. Unstaged work passes `pnpm precommit`
and still fails CI's `format:check`, so also run `pnpm format:check` when you have not
staged everything.

### A user-visible change is not done until the docs and the notebooks say so

Before opening a PR that adds or changes a feature, check whether these need to move with it —
none of them is covered by `pnpm precommit`, and all three have shipped stale:

- **The published docs** (`docs/guide/`), for anything reaching a CLI flag, an option default,
  or the bundle format. `docs/guide/annotations.md` is generated, so edit its source instead.
- **The Colab notebooks** (`apps/protspace/notebooks/`), for anything a notebook restates —
  a model list, an install command, a flag. They are excluded from prettier and from ruff's CI
  paths, so nothing tells you when they drift; prefer importing the value from the package over
  retyping it, as the prep notebook does with `EMBEDDER_MODELS`.
- **`apps/protspace/CLAUDE.md`**, for a new command, test file, or dependency.

Where a fact has to exist in two places, pin them with a test rather than a comment asking the
next reader to keep them in step — see `tests/test_docs_extras_sync.py`.

## End-to-end tests (Playwright)

`e2e.yml` is the only suite that drives the real app in a browser, so several subsystems —
EAT provenance connectors, isolation, dataset swap — have no other coverage at all.
`pnpm precommit` does not touch them.

It runs nightly on `main`, and on any PR touching the web app, the packages it builds on, or
the root files that decide what those resolve to — `e2e.yml` owns the exact list. For anything
else, dispatch it:

```bash
gh workflow run e2e.yml --ref <branch>   # in CI, any branch
pnpm test:e2e                            # locally
```

**Never dismiss a red run as flaky on the strength of local passes.** The regression that
prompted this section failed 6/6 in CI and 0/17 locally. The baseline worth comparing
against is the nightly's history on `main` (`gh run list --workflow=e2e.yml
--event=schedule`), not your machine.

## Python workspace members (uv)

The Python packages are uv workspace members (root `[tool.uv.workspace]`) sharing one root
`uv.lock`. A new **top-level** member needs three things it does not get for free:

- **Its own workflow** in `.github/workflows/` (GitHub runs workflows only from the repo root),
  path-filtered on the member's directory **and** `uv.lock` — a dependency bump reaches it through
  the root lock alone. See `prep-ci.yml` for a worked example.
- **Its own `[tool.ruff]`**, with `target-version` matching its `requires-python`. Ruff resolves the
  nearest _ancestor_ config, so a member without one silently inherits another member's rules and
  target version — or ruff's defaults if no ancestor has a `[tool.ruff]` table.
- **Test/lint-only deps in `[dependency-groups]`**, not `[project.optional-dependencies]`.
  Groups sync by default; extras do not, and a `dev` extra is installable by consumers.

A member nested inside another — currently only `apps/protspace/packages/protlabel` — needs
neither of the first two: `protspace-ci.yml` already lints and tests it via `packages/`, and it
inherits `apps/protspace`'s ruff config, which is correct only while their `requires-python`
floors agree.

## Commit style

Angular-style commit messages, subject under 72 characters:

- `feat(scope): description` — new features
- `fix(scope): description` — bug fixes
- `refactor(scope): description` — code refactoring
- `docs(scope): description` — documentation changes
- `test(scope): description` — test additions/changes
- `chore(scope): description` — maintenance tasks

## Referring to issues from before the monorepo merge

Bare `#N` resolves against **this** repo, which inherited the frontend's numbering. The
standalone Python repo's issues did not come with it: they live at
`tsenoner/protspace-legacy#N` and must be written out in full. A bare `#57` here silently
lands on an unrelated frontend PR — it returns HTTP 200, so nothing flags it.

Three were transferred rather than stranded and have new numbers here: legacy `#31` → `#324`,
`#59` → `#320`, `#64` → `#318`.

In a doc that cites several, qualify once on a definitional line (`**Issues:**`, `**Refs:**`)
and keep the body bare, rather than expanding every mention — full qualification turns
headings into `### 2.3 tsenoner/protspace-legacy#57: ...`. Code comments and docstrings always
qualify in full, since no definitional line travels with them.

## Never squash-merge a PR that touches `apps/protspace/`

**Mixing frontend and backend in one PR is fine** — it is one of the reasons the two repos
were merged. The release tooling is built for it, and it works _per commit_:

- `protspace-release.yml` is the repo's only semantic-release and the version authority for
  the **PyPI package alone**. It is `paths:`-filtered to `apps/protspace/**` plus its own
  workflow file, so a PR touching neither cannot release at all. Web-only work triggers
  `deploy.yml` (a Pages deploy, not a version bump).
- Once it runs, `commit_parser = "conventional-monorepo"` with `path_filters = ["."]`
  (`apps/protspace/pyproject.toml`) counts **only commits that touch `apps/protspace/`**. A
  `feat(core):` commit in the same PR that only touches `packages/` is ignored — it cannot
  inflate the Python version or land in its changelog.

**Squash-merging destroys that scoping.** Squashing collapses every branch commit into one
commit that touches _all_ the paths at once, so:

- it passes the path filter as long as _anything_ in the PR touched `apps/protspace/`, and
- there are no longer separate commits to scope — the single message is parsed as a whole,
  and GitHub's default squash body (`squash_merge_commit_message: COMMIT_MESSAGES`) lists
  every branch commit subject.

A frontend `feat:` therefore bumps the Python package. Observed 2026-07-24: PR #387, titled
`refactor(protspace): …`, carried `fix(ci): relock uv.lock` in its squash body and cut v4.9.1.

**So: use a merge commit or rebase merge.** Both keep each commit's own paths and own type,
which is exactly what the monorepo parser needs. Squash is only safe for a PR that touches
no Python at all — and such a PR cannot release anyway.

**This is now enforced, not just documented:** the repository has `allow_squash_merge: false`,
so GitHub offers no squash button on any PR. The enforcement is deliberately broader than the
rule above — it covers frontend-only PRs too, because the setting is repo-wide and cannot be
scoped to a path. Do not re-enable it to "unblock" a PR: the button being absent is the fix,
and this section is the reason it was turned off.

Commit types still matter, per commit:

- Want no release from a backend-touching commit? Give it a non-releasing type
  (`ci` / `chore` / `refactor` / `test` / `docs`).
- A real `fix:` or `feat:` under `apps/protspace/` earns a release; that is correct.
- Use `feat:` only for changes visible to **package users**. Dev-only work — tooling, CI,
  test harnesses, internal refactors — takes `chore:` / `ci:` / `test:` / `refactor:`, so it
  cannot trigger an unwanted minor bump.
