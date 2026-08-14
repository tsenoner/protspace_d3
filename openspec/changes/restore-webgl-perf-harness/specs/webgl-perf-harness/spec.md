## ADDED Requirements

### Requirement: Readiness is gated on the interaction layer, not on host fields

The benchmark's readiness gate SHALL determine that programmatic zoom is available by asking the
interaction layer, and SHALL NOT read zoom state off the scatter-plot host. The controller's
existence alone SHALL NOT satisfy the gate: the host assigns the controller before calling
`initialize()`, and `initialize()` returns early when the host has no SVG, so a non-null controller
can carry null zoom state indefinitely.

#### Scenario: A loaded plot reaches the ready state

- **WHEN** the gate runs against a scatter-plot that has data, plot geometry, an SVG, scales, a
  renderer, and an initialized interaction layer
- **THEN** the gate resolves promptly rather than waiting out its timeout

#### Scenario: A plot that never receives data

- **WHEN** the gate runs against a scatter-plot whose data is never assigned
- **THEN** the gate rejects at its timeout with an error naming the wait it gave up on

#### Scenario: The interaction layer exists but was never initialized

- **WHEN** the controller was constructed but `initialize()` did not wire zoom to an SVG
- **THEN** the gate treats zoom as unavailable rather than as ready

### Requirement: Zoom and pan scenarios drive the real interaction path

The zoomInOut and dragCanvas scenarios SHALL apply their transforms through d3's zoom behaviour, so
the transform datum d3 stores on the SVG node stays authoritative and the render they measure is
the one a user gesture would trigger. They SHALL NOT apply transforms by a route that updates the
rendered transform without updating that datum.

#### Scenario: A programmatic zoom moves the plot

- **WHEN** the benchmark scales the view by a factor
- **THEN** the rendered transform changes accordingly and a render pass is recorded

#### Scenario: A programmatic pan moves the plot

- **WHEN** the benchmark translates the view
- **THEN** the rendered transform changes accordingly and a render pass is recorded

#### Scenario: A scenario restores the pre-run transform

- **WHEN** a zoom or pan scenario finishes and restores the transform it saved
- **THEN** the view returns to its pre-scenario state and a subsequent user gesture continues from
  that state rather than jumping to a stale one

### Requirement: A failing dataset SHALL NOT discard the run

The suite SHALL record a per-dataset failure and continue to the next dataset, and SHALL still emit
its results file containing every dataset that succeeded. A single dataset that throws SHALL NOT
prevent the results of already-measured datasets from being written.

#### Scenario: One dataset of several fails

- **WHEN** a dataset fails to load or measure and other datasets succeed
- **THEN** the results file is emitted, contains the successful datasets' measurements, and records
  the failing dataset with its error

#### Scenario: Every dataset fails

- **WHEN** no dataset produces measurements
- **THEN** the run fails loudly rather than emitting a results file that reads as a successful run

### Requirement: Dataset loading waits SHALL be bounded

Every wait in the dataset load path SHALL fail at its own timeout with an error identifying the
dataset and the condition that was not met. No wait SHALL be able to hang until an enclosing
harness timeout.

#### Scenario: A dataset load never finalizes

- **WHEN** a load is initiated and the application never reaches a loaded state for it
- **THEN** the wait fails at its own timeout, naming the dataset and the unmet condition, rather
  than blocking indefinitely

### Requirement: An empty run SHALL NOT pass validation

The benchmark's validation SHALL reject a results file whose scenarios recorded no measurements,
and SHALL reject one that recorded a dataset error. Asserting only that scenario names are present
SHALL NOT be sufficient.

#### Scenario: Scenarios are present but recorded nothing

- **WHEN** the results file lists every expected scenario but a scenario recorded no passes
- **THEN** validation fails rather than reporting a green run

#### Scenario: A dataset error was captured

- **WHEN** the results file records a dataset that failed
- **THEN** validation fails and surfaces that dataset's error

### Requirement: The host-runner coupling SHALL be covered by a test

A test SHALL assert the benchmark runner's observable contract with the scatter-plot host, and
SHALL run in the unit suite that gates frontend changes. It SHALL assert behavior rather than the
names of host members, so that relaxing the readiness gate cannot make it pass.

#### Scenario: A refactor moves state the runner depends on

- **WHEN** state the benchmark relies on moves out of the host or stops being populated
- **THEN** the test fails in CI on that change rather than at the next manual benchmark run

#### Scenario: The gate is weakened instead of repaired

- **WHEN** a readiness condition is deleted rather than repointed at its new owner
- **THEN** a test still fails, because readiness is asserted together with the zoom behavior it
  is supposed to guarantee

### Requirement: The benchmark SHALL run without the product tour

The benchmark's browser context SHALL start with the product tour already marked complete, so no
tour overlay paints during a measured window. Suppression SHALL be configured in the harness rather
than by a branch in application code.

#### Scenario: A benchmark run opens the application

- **WHEN** the benchmark navigates to the explore view and loads its first dataset
- **THEN** no product-tour overlay appears at any point during the run

#### Scenario: A normal first visit

- **WHEN** a user opens the explore view for the first time outside the benchmark
- **THEN** the product tour still auto-starts
