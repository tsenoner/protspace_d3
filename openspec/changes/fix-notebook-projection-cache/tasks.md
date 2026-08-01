## 1. Regression coverage

- [x] 1.1 Add the smallest pipeline regression that changes same-name input embeddings across retained-cache runs and asserts projection refresh processes the second input.
- [x] 1.2 Run the regression before implementation and record the expected stale-cache failure.

## 2. Notebook implementation

- [x] 2.1 Configure `ProtSpace_Preparation.ipynb` to explicitly refresh only the projection stage on every Generate action.
- [x] 2.2 Keep query, embedding, and annotation cache wiring unchanged.

## 3. Focused verification

- [x] 3.1 Run the regression after implementation and observe it pass.
- [x] 3.2 Validate the notebook with `nbformat` and compile every code cell after removing Colab magics.
- [x] 3.3 Verify the original two-run reproduction returns coordinates from the changed input and invokes the reducer twice.

## 4. Repository gates

- [x] 4.1 Run affected Python tests and Ruff checks.
- [x] 4.2 Run `pnpm precommit` before commit and push.
