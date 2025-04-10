# ProtSpace Application TODO List

## Bug Fixes

- [ ] **AlphaFold2 Structure Display**
  - [ ] Fix 3D protein structure to display inline below legend instead of modal dialog
  - [ ] Implement automatic structure retrieval when protein is selected via search or selected
  - [ ] Simplify Molstar interface by removing sidebars

- [ ] **Legend Count Inaccuracy**
  - [ ] Update legend to display actual count of proteins for each category instead of always "1"

- [ ] **Selection Tool Functionality**
  - [ ] Implement "Box Select" feature similar to protspace.rostlab.org when pressing "Select" button

- [ ] **Image Export Quality**
  - [ ] Improve resolution of PNG and PDF exports
  - [ ] Include legend in exported images or as a separate image

- [ ] **Share Button**
  - [ ] Review share button functionality (currently redundant with json download)

- [ ] **Search Functionality**
  - [ ] Fix search to work when selection is active
  - [ ] Consider limiting search to currently isolated proteins

- [ ] **Legend Display Issues**
  - [ ] Fix flickering when clicking triangle and blue square elements

- [ ] **Firefox Hydration Error**
  - [ ] Investigate and fix React hydration error on Firefox: https://nextjs.org/docs/messages/react-hydration-error
  - [ ] Review complete error stack:
    ```typescript
    createUnhandledError@http://localhost:3000/_next/static/chunks/7d341_next_dist_client_ea142b._.js:689:49
    handleClientError@http://localhost:3000/_next/static/chunks/7d341_next_dist_client_ea142b._.js:856:56
    error@http://localhost:3000/_next/static/chunks/7d341_next_dist_client_ea142b._.js:991:56
    emitPendingHydrationWarnings@http://localhost:3000/_next/static/chunks/7d341_next_dist_compiled_react-dom_78bccc._.js:2768:103
    completeWork@http://localhost:3000/_next/static/chunks/7d341_next_dist_compiled_react-dom_78bccc._.js:7238:102
    runWithFiberInDEV@http://localhost:3000/_next/static/chunks/7d341_next_dist_compiled_react-dom_78bccc._.js:631:20
    completeUnitOfWork@http://localhost:3000/_next/static/chunks/7d341_next_dist_compiled_react-dom_78bccc._.js:8020:23
    performUnitOfWork@http://localhost:3000/_next/static/chunks/7d341_next_dist_compiled_react-dom_78bccc._.js:7957:28
    workLoopConcurrent@http://localhost:3000/_next/static/chunks/7d341_next_dist_compiled_react-dom_78bccc._.js:7951:75
    renderRootConcurrent@http://localhost:3000/_next/static/chunks/7d341_next_dist_compiled_react-dom_78bccc._.js:7933:71
    performWorkOnRoot@http://localhost:3000/_next/static/chunks/7d341_next_dist_compiled_react-dom_78bccc._.js:7565:175
    performWorkOnRootViaSchedulerTask@http://localhost:3000/_next/static/chunks/7d341_next_dist_compiled_react-dom_78bccc._.js:8394:26
    performWorkUntilDeadline@http://localhost:3000/_next/static/chunks/7d341_next_dist_compiled_3d6fe6._.js:2353:72
    ```

- [ ] **Reset Button Behavior**
  - [ ] Fix reset button to work on first click after navigating outside displayed area

- [ ] **Projection Change**
  - [ ] Implement "Reset View" when changing projection

- [ ] **UniProt Integration**
  - [ ] Refactor application architecture to use WebComponents with Lit
  - [ ] Separate scatterplot and legend component builds as Lit components for better integration

## Enhancements

- [ ] **Visualization Canvas Size**
  - [ ] Make canvas fill available screen space
  - [ ] Make D3 visualization canvas responsive
  - [ ] Implement sidebar legend for small screens to prevent cutoff

- [ ] **Selected UX improvement**
  - [ ] Disable the "selected" component when nothing is selected
