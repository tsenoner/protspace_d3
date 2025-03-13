# ProtSpace: Feature List

## 1. Core Visualization

- **Protein Plot**: Display proteins as points in 2D space based on selected projection
- **Multiple Projections**: Support for switching between different 2D projections (UMAP, t-SNE, etc.)
- **Feature Encoding**: Represent features through colors and shapes defined in the JSON
- **Dynamic Legend**: Show feature values with counts of proteins per value
- **Responsive Display**: Adapt visualization to browser window size
- **Transparency Settings**: Default alpha of 0.8 for all points
- **D3.js Implementation**: Powerful visualization using modern web standards
- **Web Component Architecture**: Core visualization components as framework-agnostic web components using Lit

## 2. Data Navigation & Interaction

- **Projection Switching**: Toggle between different 2D projections with instant view changes
- **Feature Selection**: Switch between different features for visualization
- **Zoom & Pan**: Navigate within the visualization with smooth zoom in/out and panning
- **View Reset**: Return to original view with a single click
- **Responsive Controls**: Interface adapts to different screen sizes (targeting desktop and tablet)

## 3. Selection System

- **Hover Information**: Display protein ID and current feature value on hover
- **Click Selection**:
  - Highlight proteins when clicked by changing alpha to 1.0
  - Increase border width and dot size of selected proteins
  - Decrease alpha of all non-selected points to 0.2
- **Search Functionality**: Find proteins by ID with auto-suggestions
- **Selection Management**: View and remove selected proteins from a list in the header
- **Selection Persistence**: Maintain selections when switching between projections or features

## 4. Interactive Legend

- **Smart Display**: Show only top 10 most frequent feature values by default
- **"Other" Category**: Group remaining values automatically
- **"NaN" Handling**: Always display "NaN" category if applicable
- **Value Counts**: Display count of proteins for each feature value
- **Toggle Functionality**:
  - Single click: Toggle visibility of specific feature values
  - Double click on active label: Show only that label, hide others
  - Double click on only active/inactive label: Show all labels
- **Visual Indicators**: Show reduced opacity for hidden values
- **Customization**:
  - Settings modal for legend customization
  - Color and shape modification for feature values
  - Extract specific values from "Other" category
  - Z-order controls for managing overlay priorities

## 5. Data Management

- **Isolation Mode**:
  - `Isolate` button to focus view on only selected proteins
  - Removes all non-selected proteins from visualization
  - Updates legend to show only relevant feature values
  - `Show All` button to return to full dataset view
- **Export Options**:
  - Download IDs of selected or isolated proteins
  - Download full visualization as image (PNG, SVG, PDF)
  - Export JSON file with all data and user-defined styles

## 6. Protein Structure Visualization

- **Molstar Integration**: Embed Molstar viewer for 3D protein structure visualization
- **Single Structure View**: Display one protein structure at a time in right sidebar
- **AlphaFold Retrieval**: Load 3D structure from AlphaFold when a protein is selected
- **Availability Feedback**: Indicate when a structure is not available
- **Basic Controls**: Support rotation and viewing controls (via Molstar)
- **Dismissible View**: Close button to dismiss the 3D viewer

## 7. Session Management

- **Stateless Application**: No browser storage, explicit user save/load actions
- **Session Save**: Export current state (including customizations) as JSON (.protspace file)
- **Session Load**: Restore previous visualization state from JSON file
- **Complete State Persistence**:
  - Current projection view
  - Selected and highlighted proteins
  - Legend status (visibility toggles, extractions)
  - Custom visual encodings for all features
  - Custom z-ordering of legend elements
  - Isolation mode status if active

## 8. Error Handling & User Feedback

- **Toast Notifications**: For success confirmations and informational updates
- **Error Banners**: For critical errors, validation failures, and network issues
- **Data Validation**: Detailed validation errors with line references
- **Loading Indicators**: Progress indicators during file processing and 3D structure retrieval
- **Action Confirmations**: Visual confirmation for selections and user actions
- **Count Indicators**: Display total/displayed/selected protein counts

## 9. Performance Optimization

- **Initial Support**: Handle visualization of datasets from ~100 to potentially 1M+ proteins
- **Efficient Rendering**: Direct DOM manipulation with D3.js inside web components
- **Scalable Architecture**: Light DOM approach for web components to enable Tailwind CSS styling

## 10. Technical Implementation

- **Hybrid Architecture**: Core visualization as web components, application shell using React/Next.js
- **TypeScript**: Type-safe implementation throughout the application
- **Validation**: Zod.dev for JSON schema validation
- **Styling**: Tailwind CSS for consistent design
- **Package Management**: pnpm with Turborepo for monorepo management

## 11. Future Considerations

- **Progressive Rendering**: For initial downsampled view of large datasets
- **WebGL Rendering**: For very large datasets
- **Spatial Indexing**: For efficient hover/selection
- **Data Chunking**: Based on viewport for optimized rendering
- **Web Workers**: For heavy computations
- **Backend-based Sharing**: With URLs and session codes
- **Password Protection**: For shared sessions

## 12. Features Planned for Future Releases

- **Nearest Neighbors Analysis**: Visualization of protein relationships in high-dimensional space
- **Download Full Feature**: Download the full feature data for the selected proteins in CSV