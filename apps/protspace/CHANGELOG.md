# CHANGELOG


## v4.11.0 (2026-08-11)

### Bug Fixes

- **transfer**: Error when an explicit reference rule matches nothing
  ([`0a653e0`](https://github.com/tsenoner/protspace/commit/0a653e0293b1bae55460d4b7bd292340c9eee32a))

### Documentation

- **transfer**: Stop teaching the filters-are-required workflow
  ([`9864e04`](https://github.com/tsenoner/protspace/commit/9864e04f4ab10f7ca2fdca414f157e23b863ae02))

### Features

- **transfer**: Apply EAT within one dataset when no rules are given
  ([`cda36bc`](https://github.com/tsenoner/protspace/commit/cda36bc4fe324cca9b9f4235f33f2bb94d0628cf))

### Refactoring

- **transfer**: Fold the both-open branch into the shared rule checks
  ([`878e430`](https://github.com/tsenoner/protspace/commit/878e4304a151756c8aa98e60b081e331e7a955e7))


## v4.10.3 (2026-08-10)

### Bug Fixes

- **protspace**: Derive the annotation schema from every record on every path
  ([`3d31875`](https://github.com/tsenoner/protspace/commit/3d31875c47dc5877791ffcdce3ba4a8a39c8cf5f))

- **protspace**: Scope the pdb cache migration and survive a failed refresh
  ([`88b8187`](https://github.com/tsenoner/protspace/commit/88b8187bb2be324a71ae8e35d8340b10f258a8b1))

### Refactoring

- **protspace**: Consolidate annotation cache versioning and dedupe transforms
  ([`e400228`](https://github.com/tsenoner/protspace/commit/e400228402e87f6d0a78dbddc2dd58c518ef2acf))

- **protspace**: Derive cache migrations from a version table
  ([`36e2894`](https://github.com/tsenoner/protspace/commit/36e28944bfb82ede1fd850b17eeabf6d8ad827d3))


## v4.10.2 (2026-08-10)

### Bug Fixes

- **protspace**: Keep a null pLDDT from blanking a TED accession
  ([`8ed0ab6`](https://github.com/tsenoner/protspace/commit/8ed0ab6c88ce287aa8d35e11621ea8847af64f91))

- **protspace**: Migrate legacy TED labels when reading the cache
  ([`014c1de`](https://github.com/tsenoner/protspace/commit/014c1de06f8653abed7f582370c702810681bb3c))

- **protspace**: Warn on legacy TED cache from every reuse path
  ([`3c7b862`](https://github.com/tsenoner/protspace/commit/3c7b862b662120b81168fee40cf2d38559068809))


## v4.10.1 (2026-08-07)

### Bug Fixes

- **bundle**: Close the review gaps in numeric typing and N/A handling
  ([`abe27bc`](https://github.com/tsenoner/protspace/commit/abe27bcdc8bad9ff59ba6174497f2ab639b3152c))

- **settings**: Read and preserve the frontend settings envelope in Python
  ([`1c33e62`](https://github.com/tsenoner/protspace/commit/1c33e62ee897f4df261069f98ddf068262ffdebc))

### Refactoring

- **bundle**: Derive numeric column types from the parquet schema
  ([`614cb42`](https://github.com/tsenoner/protspace/commit/614cb420c7612e997d2d80f78d4900793cb87c41))


## v4.10.0 (2026-08-06)

### Bug Fixes

- Correct four defects the review agents found in the statistics feature
  ([`87cac68`](https://github.com/tsenoner/protspace/commit/87cac682a4fe353201c488e7ac77a8281713a939))

- **annotations**: Preserve cached annotation semantics
  ([`3fbe03a`](https://github.com/tsenoner/protspace/commit/3fbe03a837aea83846d5eb166870c9e3dc45f812))

- **annotations**: Preserve cached pdb states
  ([`ee02c86`](https://github.com/tsenoner/protspace/commit/ee02c86864ae3b6d3568a9b29e05779bfeef5b97))

- **annotations**: Preserve cached taxonomy migration
  ([`f42426e`](https://github.com/tsenoner/protspace/commit/f42426e81e04e88384c552e6e3bc59a14d97436e))

- **annotations**: Preserve later annotation columns
  ([`2b2c88e`](https://github.com/tsenoner/protspace/commit/2b2c88e3a575dbffd9a70bf64eb2cb4904da0501))

- **annotations**: Preserve missing pdb availability
  ([`5d9d5b8`](https://github.com/tsenoner/protspace/commit/5d9d5b89337e245f4ce64fd56c6c972933d87e59))

- **annotations**: Preserve safe cache migration
  ([`b03b8f3`](https://github.com/tsenoner/protspace/commit/b03b8f3137a52586c8f345565d2942e63c2107ae))

- **protspace**: Address legacy TED cache output
  ([`31c5a93`](https://github.com/tsenoner/protspace/commit/31c5a93496f8e9f53c60b5e42cf03050891da2b6))

- **protspace**: Preserve unlabeled TED domain names
  ([`b724fba`](https://github.com/tsenoner/protspace/commit/b724fba0b7ac550a53aa18e521153258877c2268))

- **stats**: Compute per-category parts before emitting aggregates
  ([`571ecae`](https://github.com/tsenoner/protspace/commit/571ecae71e02fa5d3b514455cd9d5bc8ed1fbdf3))

- **stats**: Score around singleton categories instead of suppressing DBI/CH
  ([`b6a103e`](https://github.com/tsenoner/protspace/commit/b6a103e5d5cebfaf941684054e218b0a70db86cc))

- **stats**: Weight per-category silhouette by category size, not DBI
  ([`5135697`](https://github.com/tsenoner/protspace/commit/51356978c402d20f61a7eff46ed53c58fe8b4255))

### Documentation

- **protspace**: Document TED cache refresh
  ([`c98f66f`](https://github.com/tsenoner/protspace/commit/c98f66f3eeb10137add1c382e232d629c07e7b03))

- **stats**: Correct the retracted invariant on the silhouette helper
  ([`86b78e6`](https://github.com/tsenoner/protspace/commit/86b78e6e107d390e81430addd7caa81f4a16fb7b))

### Features

- **stats**: Score cluster_* membership columns as annotations
  ([`be8e7e7`](https://github.com/tsenoner/protspace/commit/be8e7e785ee6a7f486c30e07eebbd3c47de509c1))

- **stats**: Score silhouette and Davies-Bouldin per category
  ([`29beab1`](https://github.com/tsenoner/protspace/commit/29beab1481427422a95bde7666e30d83d8c6ba40))

### Refactoring

- State the metric registry, ceiling rule and cluster caveat once
  ([`510335c`](https://github.com/tsenoner/protspace/commit/510335c1e86619109a3895845204bf257a2b333a))

- **annotations**: Dedupe imports and use taxonomy constant
  ([`b885e6f`](https://github.com/tsenoner/protspace/commit/b885e6f1473975322a2b89ea90b3cf6de9502cef))

- **protspace**: Collapse TED domain formatting to one emit site
  ([`a66b347`](https://github.com/tsenoner/protspace/commit/a66b3474fad58dd4a32dfa28122135d8048be4a2))

### Testing

- **stats**: Pin per-category decomposition invariants against aggregate-repeat bugs
  ([`45d20e9`](https://github.com/tsenoner/protspace/commit/45d20e90a6e5b68cdf12ffc8f6a5df350f2ac059))


## v4.9.1 (2026-07-24)

### Bug Fixes

- **ci**: Relock uv.lock to 4.9.0 after the release version bump
  ([#387](https://github.com/tsenoner/protspace/pull/387),
  [`6e6ca12`](https://github.com/tsenoner/protspace/commit/6e6ca12af95f38224e7efbe5a3db5aa717b9b1c6))

### Chores

- **scripts**: Drop broken tomli fallback in generate_examples
  ([#387](https://github.com/tsenoner/protspace/pull/387),
  [`6e6ca12`](https://github.com/tsenoner/protspace/commit/6e6ca12af95f38224e7efbe5a3db5aa717b9b1c6))

### Continuous Integration

- **release**: Keep uv.lock in sync on release so --locked CI stays green
  ([#387](https://github.com/tsenoner/protspace/pull/387),
  [`6e6ca12`](https://github.com/tsenoner/protspace/commit/6e6ca12af95f38224e7efbe5a3db5aa717b9b1c6))

### Refactoring

- **protspace**: Remove dead annoy shim and tomli fallback
  ([#387](https://github.com/tsenoner/protspace/pull/387),
  [`6e6ca12`](https://github.com/tsenoner/protspace/commit/6e6ca12af95f38224e7efbe5a3db5aa717b9b1c6))

- **reducers**: Remove dead annoy fallback shim
  ([#387](https://github.com/tsenoner/protspace/pull/387),
  [`6e6ca12`](https://github.com/tsenoner/protspace/commit/6e6ca12af95f38224e7efbe5a3db5aa717b9b1c6))

- **release**: Tidy sync_lock_version.py per review
  ([#387](https://github.com/tsenoner/protspace/pull/387),
  [`6e6ca12`](https://github.com/tsenoner/protspace/commit/6e6ca12af95f38224e7efbe5a3db5aa717b9b1c6))


## v4.9.0 (2026-07-24)

### Chores

- **protspace**: Drop duplicate deps and drifting version strings
  ([#376](https://github.com/tsenoner/protspace/pull/376),
  [`70b54f9`](https://github.com/tsenoner/protspace/commit/70b54f97867115949821482ee9fcdf12eb5b1ea6))

- **protspace**: Retire the legacy Dash container image
  ([#374](https://github.com/tsenoner/protspace/pull/374),
  [`4c36e5d`](https://github.com/tsenoner/protspace/commit/4c36e5ddead514a991a64ac70a7df9c136dd2b60))

### Continuous Integration

- **protspace**: Drop the redundant root .python-version
  ([#382](https://github.com/tsenoner/protspace/pull/382),
  [`f93f9c6`](https://github.com/tsenoner/protspace/commit/f93f9c6a51e8ac248bda64d91aa51cd8de7e21ad))

- **protspace**: Test Python 3.12-3.14, pin interpreters, add 3.15 canary
  ([#382](https://github.com/tsenoner/protspace/pull/382),
  [`f93f9c6`](https://github.com/tsenoner/protspace/commit/f93f9c6a51e8ac248bda64d91aa51cd8de7e21ad))

### Documentation

- **protspace**: Clarify why the ruff target-version pin is load-bearing
  ([#382](https://github.com/tsenoner/protspace/pull/382),
  [`f93f9c6`](https://github.com/tsenoner/protspace/commit/f93f9c6a51e8ac248bda64d91aa51cd8de7e21ad))

- **protspace**: Correct drifting facts in CLAUDE.md and installation docs
  ([#377](https://github.com/tsenoner/protspace/pull/377),
  [`fc88c03`](https://github.com/tsenoner/protspace/commit/fc88c037c2c54b6bae55b7013b230a5cb122db4d))

### Features

- **protspace**: Require Python >=3.12 ([#382](https://github.com/tsenoner/protspace/pull/382),
  [`f93f9c6`](https://github.com/tsenoner/protspace/commit/f93f9c6a51e8ac248bda64d91aa51cd8de7e21ad))

- **protspace**: Require Python >=3.12, fix the CI version matrix, add a future-Python canary
  ([#382](https://github.com/tsenoner/protspace/pull/382),
  [`f93f9c6`](https://github.com/tsenoner/protspace/commit/f93f9c6a51e8ac248bda64d91aa51cd8de7e21ad))

### Refactoring

- **protspace**: Adopt py312 idioms unmasked by the ruff bump
  ([#382](https://github.com/tsenoner/protspace/pull/382),
  [`f93f9c6`](https://github.com/tsenoner/protspace/commit/f93f9c6a51e8ac248bda64d91aa51cd8de7e21ad))


## v4.8.2 (2026-07-21)

### Bug Fixes

- **eat**: Preserve structured transfer semantics
  ([#277](https://github.com/tsenoner/protspace/pull/277),
  [`d53bc50`](https://github.com/tsenoner/protspace/commit/d53bc50e0a8d287bd5a3adf6b34e32602817c143))

- **eat**: Stabilize large-dataset remediation
  ([#277](https://github.com/tsenoner/protspace/pull/277),
  [`3917652`](https://github.com/tsenoner/protspace/commit/39176526fbf2b1b855b59084d3156b4d24591d5a))


## v4.8.1 (2026-07-20)

### Bug Fixes

- **protspace**: Keep plotly out of the CLI import path
  ([`c899ff9`](https://github.com/tsenoner/protspace/commit/c899ff9ab3acda5e468d1029da8a09545bd02d03))

- **protspace**: Preserve MARKER_SHAPES_2D public import path
  ([`33e5503`](https://github.com/tsenoner/protspace/commit/33e55034f56f285be9d13a336c2e985e94569aa2))

### Chores

- Add package metadata and web SEO after monorepo move
  ([`af65547`](https://github.com/tsenoner/protspace/commit/af65547cbb44cb9442cc44f05f1c5baa75cd2d9a))

### Code Style

- **cli**: Wrap long ANNOTATIONS_URL to satisfy ruff format
  ([`432a215`](https://github.com/tsenoner/protspace/commit/432a215c1820f7fbef8dc42042df421f7ede3112))

### Documentation

- Align product descriptions and taglines across all surfaces
  ([`51e1bec`](https://github.com/tsenoner/protspace/commit/51e1becdf15b9f42c6852694be2ef5f747aee1c4))

- Fix pre-monorepo paths and stale facts after monorepo move
  ([`44a53ad`](https://github.com/tsenoner/protspace/commit/44a53ad5ca752a15a501d5bae7d70fdf5420d61d))

- Fix stale links, correct license to MIT, add citations after monorepo move
  ([`71d0206`](https://github.com/tsenoner/protspace/commit/71d02065d7b342e3691f793f9a8b146728a2aa70))

- Rename citation label "tool paper" -> "original publication"
  ([`12d8944`](https://github.com/tsenoner/protspace/commit/12d8944b85b5f5cbc44d24cbaf3d47c2d5761372))

- Restructure README (user-focused + badges), drop legacy "ProtSpace Web" brand
  ([`650e521`](https://github.com/tsenoner/protspace/commit/650e521061c983a8a7108af2bf1deda098778163))

- **embed**: Pinpoint Biocentral ESM-C root cause (biotrainer arch mis-load)
  ([`f5c1426`](https://github.com/tsenoner/protspace/commit/f5c142692afd19e764b052dc47b3b5f7021d5ff3))

- **embed**: Record local↔Biocentral embedding parity (PR3, issue #59)
  ([`f4c4720`](https://github.com/tsenoner/protspace/commit/f4c47203fbd583e665d850022860d44edf2a78ea))

- **notebook**: Append optional in-session EAT cell to Preparation Colab (issue #59, PR6)
  ([`4e15556`](https://github.com/tsenoner/protspace/commit/4e1555652419c6d17c18a7b44ba9b7cc145ff68f))

- **notebook**: Local embedding backend in Preparation Colab (issue #59, PR4)
  ([`ebd7d37`](https://github.com/tsenoner/protspace/commit/ebd7d376d49f811d74b7de31b25befb241ebb7b3))

- **notebook**: Wire projection statistics toggle into Preparation Colab (issue #59, PR5)
  ([`10da014`](https://github.com/tsenoner/protspace/commit/10da0147cfbf05953db3510ec3223f554c854253))

### Refactoring

- **protspace**: Tidy lazy MARKER_SHAPES_2D resolution
  ([`49eb031`](https://github.com/tsenoner/protspace/commit/49eb031a51052e3bc4f11d60751ee08b62950a86))


## v4.8.0 (2026-07-16)

### Chores

- Bump API for proxy fix
  ([`66130be`](https://github.com/tsenoner/protspace/commit/66130be8d3189a37b0276695cff597e161b00215))

### Continuous Integration

- **release**: Upgrade python-semantic-release to v10 + scope releases to apps/protspace
  ([#328](https://github.com/tsenoner/protspace/pull/328),
  [`3482d85`](https://github.com/tsenoner/protspace/commit/3482d852581579f26236210b045ce14a58e5265a))

### Features

- **embed**: Local GPU/CPU embedding backend + biocentral/local switch (issue #59)
  ([`cec9334`](https://github.com/tsenoner/protspace/commit/cec933442a680ce03e9701c49a3e6e0b5b4e3beb))


## v4.7.2 (2026-07-14)

### Bug Fixes

- Point the PyPI README "ProtSpace Web" source link to tsenoner/protspace
  ([#327](https://github.com/tsenoner/protspace/pull/327),
  [`773cd81`](https://github.com/tsenoner/protspace/commit/773cd812a4978116435181b993eeeaf8666d93db))


## v4.7.1 (2026-07-14)

- Initial Release
