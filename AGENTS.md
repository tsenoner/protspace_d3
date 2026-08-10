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
    **Run this on the branch as the last commit before merging the PR — never "after the
    merge".** See below.
  - `/opsx:explore` — investigate/clarify before committing to a change
  - If slash commands are unavailable, invoke the equivalent OpenSpec skill or run the `openspec` CLI directly.
- **`openspec/specs/` is the source of truth** for current behavior. Read the relevant specs
  before proposing a change.
- **Trivial changes** (typo, one-line fix, formatting, dependency bump) do not need a full
  proposal — use judgment.

### Archive before the merge, not after

`/opsx:archive` is what makes `openspec/specs/` true. Treat it as part of the change, not as
cleanup: run it on the branch, commit the result, and let it merge with everything else.

Deferring it to "after the merge" does not work in practice — the PR closes, the branch is
gone, attention moves on, and nobody comes back for it. Every deferral leaves
`openspec/specs/` describing behavior the code no longer has, which is worse than no spec at
all: the next change reads it as current and plans against a fiction.

Concretely, before requesting or performing a merge:

1. Tick off `tasks.md`, and add any task the review turned up so the archived record matches
   what actually shipped.
2. Reread `proposal.md` / `design.md` against the final diff. Rationale written before the
   review is often stale by the end of it, and archiving freezes it.
3. Run `openspec validate <change> --strict`, then `/opsx:archive`.
4. Commit, push, and let CI go green on that commit — the archive is the last commit on the
   branch.

**Local setup (one time per machine):**

```bash
npm i -g @fission-ai/openspec   # the workflow skills shell out to this CLI
openspec init                   # generates per-tool skills/commands for this repo
```

Only this `AGENTS.md` and the `openspec/` directory (specs + changes) are committed. The per-tool
skills/commands under `.claude/` and `.codex/`, and Codex's global prompts in `~/.codex/prompts/`,
are CLI-generated and gitignored — regenerate them with `openspec init` / `openspec update`.

## Before committing

Always run `pnpm precommit` before creating any git commit. It runs:

- Prettier (format)
- ESLint (lint)
- TypeScript (typecheck)
- Vitest (tests)

It is JS-only; Python workspace members are covered by their own CI workflows (see below).

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

Commit types still matter, per commit:

- Want no release from a backend-touching commit? Give it a non-releasing type
  (`ci` / `chore` / `refactor` / `test` / `docs`).
- A real `fix:` or `feat:` under `apps/protspace/` earns a release; that is correct.
- Use `feat:` only for changes visible to **package users**. Dev-only work — tooling, CI,
  test harnesses, internal refactors — takes `chore:` / `ci:` / `test:` / `refactor:`, so it
  cannot trigger an unwanted minor bump.
