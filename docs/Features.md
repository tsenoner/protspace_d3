# ProtSpace: Feature List

## 1. Core Visualization

- **Protein Plot**: Display proteins as points in 2D space based on selected projection
- **Feature Encoding**: Represent features through colors and shapes defined in the JSON
- **Dynamic Legend**: Show feature values with counts of proteins per value in brackets
- **Responsive Display**: Adapt visualization to browser window size
- **Transparency Settings**: Default alpha of 0.8 for all points

## 2. Data Navigation & Interaction

- **Projection Switching**: Toggle between different 2D projections
- **Feature Selection**: Switch between different features for visualization
- **Zoom & Pan**: Navigate within the visualization with zoom in/out and panning
- **View Reset**: Return to original view with a single click

## 3. Selection System

- **Hover Information**: Display protein ID and current feature value on hover
- **Click Selection**:
  - Highlight proteins when clicked by changing alpha to 1.0
  - Increase border width and dot size of selected proteins
  - Decrease alpha of all non-selected points to 0.2
- **Search Bar**: Find proteins by ID with auto-suggestions
- **Selection Management**: View and remove selected proteins from a list

## 4. Data Management

- **Isolation Mode**:
  - `Isolate` button to focus view on only selected proteins
  - `Show All` button to return to full dataset view
- **Export Options**:
  - Download IDs of selected or isolated proteins
  - Download the plot as an image (png, svg?)

## 5. Filtering & Customization

- **Legend Toggling**:
  - Hide/show specific feature values by clicking on legend items
  - Apply strikethrough and reduced alpha to toggled-off legend items
- **Style Customization**: Modify colors and shapes for feature values

## 6. Protein Structure Visualization

- **Molstar Integration**: Embed Molstar viewer for 3D protein structure visualization
- **Single Structure View**: Display one protein structure at a time
- **AlphaFold Retrieval**: Load 3D structure from AlphaFold when a protein is selected
- **Availability Feedback**: Indicate when a structure is not available

## 7. Session Management

- **Session Save**: Export current state (including style customizations) as JSON
- **Session Load**: Restore previous visualization state

## 8. Performance Optimization

- **Initial Support**: Handle visualization of 20K proteins smoothly
- **Scale Up**: Support datasets with 1M+ proteins
- **Responsive Interaction**: Maintain fluid interactions regardless of dataset size

## 9. Features Planned for Future Releases

- **Nearest Neighbors Analysis**: Visualization of protein relationships in high-dimensional space
- **Download Full Feature**: Download the full feature data for the selected proteins in CSV
-