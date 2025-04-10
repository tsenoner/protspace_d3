# Known Issues

## Bugs

1. **AlphaFold2 Structure Display**

    - The 3D protein structure should be displayed inline below the legend instead of in a separate modal dialog
    - When a user selects a protein through search, the structure should automatically be retrieved and displayed below the legend
    - Molstar interface should be minimalistic and not show the sidebars

2. **Legend Count Inaccuracy**

    - The count of proteins for each category currently always shows "1"
    - This should display the actual count of proteins belonging to that category

3. **Selection Tool Functionality**

    - The select button should implement a "Box Select" feature similar to the one on https://protspace.rostlab.org/

4. **Image Export**

    - PNG and PDF exported images are low quality
    - Add legend to images and/or as a distinct image

5. **Share Button**

    - Share button downloads the json file and is currently redundany

6. **Search Functionality**

    - When selection is active, the search has no effect
    - Suggestion: only search in the currently selected proteins

7. **Legend bug**

    - Clicking the triangle and the blue square triggers some flickering

8. **Random Error on Firefox**:

    - https://nextjs.org/docs/messages/react-hydration-error

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

9. **Reset Bug**

    - After clicking around and moving outside of the displayed area the reset button only works on the second click

10. **Changing Projection**

    - When changing projection, the view should be reset (currently not)

11. **Implementation Issue**

    - For integrating with UniProt, they want to use WebComponents.
    - Currently the app is compeletly integrated and cannot be decoupled.
    - Suggestion: Separately build the scatterplot and the legend component and integrate with the rest of the app.

## Enhancement Requests

1. **Visualization Canvas Size**

    - The D3 visualization canvas should stretch to fill the entire available screen space
    - Currently the canvas is not responsive
    - On small screens, the legend is cut off; Suggestion: implement legend as a sidebar

2. **Color Palette**

    - Adjust the color schema throughout the application for better visibility, especially in the central canvas

3. **Selected UX improvement**

    - If nothing selected, disable the selected component

4. **Legend UX improvement**

    - When clicking on a legend category, the proteins dissapear which is counterintuitive to me
    - Better: higlight on click, disappear on right click
    - Alternatively, show eye icon to toggle visibility

## Questions

-   What was the idea behind "Share Session"? How does it differ from "Save Session"? (Note: Sorry if my specifications where not on point)
