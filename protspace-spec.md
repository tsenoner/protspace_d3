# ProtSpace Technical Specification

## Overview

ProtSpace is an advanced interactive web application designed for visualizing and exploring protein data across different two-dimensional projections. The platform enables researchers and scientists to intuitively analyze relationships between proteins based on their features and structural characteristics.

## Target Users

-   **Primary Users**: Research scientists, including biologists, computational biologists, and bioinformaticians
-   **User Goals**: Generate hypotheses about protein relationships, identify patterns, and explore potential mislabeling or functional similarities

## Data Model

### Input Format

ProtSpace ingests protein data in a structured JSON format conforming to the following schema:

```json
{
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "ProtSpace Data Schema",
    "type": "object",
    "required": ["protein_ids", "features", "feature_data", "projections"],
    "properties": {
        "protein_ids": {
            "type": "array",
            "description": "Array of protein identifiers",
            "items": {
                "type": "string"
            }
        },
        "features": {
            "type": "object",
            "description": "Feature definitions including possible values and their visual representations",
            "additionalProperties": {
                "type": "object",
                "required": ["values", "colors", "shapes"],
                "properties": {
                    "values": {
                        "type": "array",
                        "description": "Possible values for this feature, including null",
                        "items": {
                            "type": ["string", "null"]
                        }
                    },
                    "colors": {
                        "type": "array",
                        "description": "RGBA color string for each possible value",
                        "items": {
                            "type": "string",
                            "pattern": "^rgba\\([0-9]{1,3},[0-9]{1,3},[0-9]{1,3},[0-9](?:\\.[0-9])?\\)$"
                        }
                    },
                    "shapes": {
                        "type": "array",
                        "description": "Shape identifier for each possible value",
                        "items": {
                            "type": "string",
                            "enum": [
                                "asterisk",
                                "circle",
                                "cross",
                                "diamond",
                                "diamond_stroke",
                                "plus",
                                "square",
                                "square_stroke",
                                "star",
                                "triangle",
                                "triangle_stroke",
                                "wye",
                                "times"
                            ]
                        }
                    }
                },
                "additionalProperties": false
            }
        },
        "feature_data": {
            "type": "object",
            "description": "Feature values for each protein. Each property key must match a key defined in the 'features' object. The value for each key is an array of indices with length equal to the number of protein_ids. Each index must be at least 0 and less than the length of the corresponding feature's 'values' array.",
            "additionalProperties": {
                "type": "array",
                "items": {
                    "type": "integer",
                    "minimum": 0
                },
                "additionalProperties": false
            }
        },
        "projections": {
            "type": "array",
            "description": "Dimensionality reduction projection information and coordinates",
            "items": {
                "type": "object",
                "required": ["name", "data"],
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Name of the projection method"
                    },
                    "metadata": {
                        "type": "object",
                        "description": "Projection method parameters; structure may vary based on the method used.",
                        "additionalProperties": true
                    },
                    "data": {
                        "type": "array",
                        "description": "2D coordinates for each protein. The outer array's length must equal the number of protein_ids.",
                        "items": {
                            "type": "array",
                            "minItems": 2,
                            "maxItems": 2,
                            "items": {
                                "type": "number"
                            }
                        }
                    }
                }
            }
        },
        "additionalProperties": false
    }
}
```

### Validation Requirements

-   Use Zod.dev for JSON schema validation
-   All input data must be validated against the schema before visualization
-   Provide clear error messages for validation failures, including line references
-   No data processing or transformation is needed as the JSON is pre-processed externally

## User Interface Components

### Layout Structure

1. **Header (slim, fixed at top)**

    - Application name/logo (left)
    - Search bar with protein ID auto-suggest (center)
    - Session controls: Save/Load buttons, ID dropdown with highlighted proteins (right)
        - ID dropdown allows deselection of highlighted proteins

2. **Control Bar (horizontal, below header)**

    - Projection selection dropdown
    - Feature selection controls
    - Selection tools (bounding box toggle, clear selections)
    - Isolation mode toggle
    - Export options dropdown

3. **Main Visualization Area (central, largest component)**

    - 2D scatterplot taking majority of screen space
    - Small, unobtrusive reset view button in corner
    - Minimal zoom/pan controls

4. **Right Sidebar (fixed width)**

    - Interactive legend at top with toggle functionality (in a static area)
    - 3D structure viewer in a dedicated static area below legend

5. **Status Bar (slim, bottom)**
    - Dataset statistics (total/displayed/selected proteins)
    - Current view information

### Responsive Design

-   Main scatterplot should resize responsibly for tablet computers or larger
-   On smaller screens, control bar can collapse to icon menus
-   Ensure all UI elements are targeted at desltop computers and remain functional for tablet computers
-   We do not target mobile.

## Core Visualization Functionality

### Scatter Plot Requirements

-   Render proteins as points using D3.js
-   Position determined by selected projection method
-   Default transparency of 0.8 for all points
-   Support zoom and pan functionality
-   Handle datasets from ~100 to potentially 1M+ proteins

### Data Navigation

-   Enable switching between different projections with instant view changes (no animations)
-   Support selection of different features for visualization
-   Provide reset view button to return to original visualization state

### Selection System

-   Hover functionality to display protein ID and feature information
-   Click selection that:
    -   Highlights proteins by increasing opacity to 1.0
    -   Enlarges the selected point
    -   Adds a border to the selected point
-   When selections are active, non-selected proteins fade to 0.2 opacity
-   Search functionality with auto-suggestion based on protein IDs
-   Selected protein management via list with removal options
-   Selection persistence when switching between projections or features

### Isolation Mode

-   Activated via dedicated button after selecting proteins
-   Removes all non-selected proteins from the visualization
-   Updates legend to show only relevant feature values
-   Updates protein counts in the legend

### Export Capabilities

-   JSON file export with all data and user-defined styles
-   List of protein IDs (selected or isolated)
-   Visualization image export in multiple formats (PNG, SVG, PDF)

## Interactive Legend

### Functionality

-   By default, display only the top 10 most frequent feature values (labels with most points)
-   Group all remaining values into a category labeled "Other"
-   Always display "NaN" category if applicable
-   Maximum of 12 total legend items (10 most frequent + "Other" + "NaN")
-   Display feature values with corresponding visual encodings (color, shape)
-   Show count of proteins for each feature value
-   Toggle visibility of specific feature values by clicking on legend items
    -   Single click: Toggle visibility (transparent = hidden)
    -   Double click on active label: Show only that label, hide others
    -   Double click on only active or inactive label: Show all labels
-   Visual indication of hidden values through reduced opacity
-   Support for extracting specific labels from the "Other" category
-   Allow changing the z-order of legend elements for better visualization control

### Customization

-   Provide settings/cogwheel button next to legend
-   Open modal dialog for customization on click
-   Allow modification of colors and shapes for specific feature values
-   Provide controls for extracting and managing "Other" category items
-   Include z-order controls for managing overlay priorities
-   Changes apply immediately to visualization

## 3D Structure Integration

### Integration with Molstar

-   Load automatically when a protein is selected in the 2D view
-   Use protein ID to request structure from AlphaFold database
-   Display in designated area below the legend in the right sidebar
-   Show only one structure at a time
-   Provide clear feedback when structures are unavailable
-   Support basic rotation and viewing controls (handled by Molstar)
-   Provide close button to dismiss the 3D viewer

## Session Management

### State Persistence

-   Completely stateless application (no browser storage)
-   All state managed through explicit user save/load actions
-   Save current state (projections, selections, customizations) as JSON file
-   Load previous sessions from JSON file
-   JSON file format matches the input schema

## Error Handling & User Feedback

### Notification System

-   **Toast notifications** for:
    -   Success confirmations
    -   Informational updates
-   **Error banners** for:
    -   Critical errors affecting functionality
    -   Validation failures
    -   Network issues

### Specific Feedback Cases

1. **Data Validation & Loading:**

    - Progress indicator during file processing
    - Detailed validation errors with line references
    - Example: "Invalid JSON format at line 42: 'feature_data.localization' contains invalid indices"

2. **3D Structure Retrieval:**

    - Loading spinner during retrieval
    - Clear message when structure isn't available
    - Network error handling with retry option

3. **User Actions:**
    - Visual confirmation for selections
    - Count indicators for selected/visible proteins
    - Confirmation dialogs for potentially destructive operations

## Performance Considerations

### Large Dataset Handling

For future implementation (not immediate priority):

-   Progressive rendering for initial downsampled view
-   WebGL rendering for very large datasets
-   Spatial indexing for efficient hover/selection
-   Data chunking based on viewport
-   Web Workers for heavy computations
-   Efficient data structures (typed arrays)

## Technical Implementation

### Technology Stack

-   **Framework**: Next.js with React
-   **Language**: TypeScript
-   **Visualization**: D3.js
-   **Styling**: Tailwind CSS with Shadcn/UI components
-   **Package Manager**: pnpm
-   **Code Quality**: ESLint
-   **Validation**: Zod.dev for schema validation

### Project Structure

```
protspace/
├── .eslintrc.js
├── .gitignore
├── next.config.js
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── public/
├── components/
│   ├── ui/
│   ├── layout/
│   ├── visualization/
│   ├── 3d-viewer/
│   └── controls/
├── lib/
│   ├── types/
│   ├── validators/
│   ├── d3/
│   └── api/
├── hooks/
├── pages/
│   ├── index.tsx
│   ├── _app.tsx
│   └── api/
└── styles/
```

## Testing Requirements

### Testing Strategy

1. **Unit Tests**

    - Schema validation
    - Data processing
    - Selection logic
    - Filter logic
    - Tool: Jest with TypeScript

2. **Component Tests**

    - D3 visualization components
    - UI controls
    - Tools: React Testing Library, vitest

3. **Integration Tests**

    - Data flow between components
    - Feature interactions
    - Export functionality
    - Tools: Cypress Component Testing

4. **Performance Testing**

    - Rendering benchmarks with datasets of varying sizes
    - Memory profiling
    - Tools: Lighthouse, Chrome DevTools Performance API

5. **End-to-End Tests**

    - Complete user workflows
    - Browser compatibility
    - Tools: Cypress, Playwright

6. **Visual Regression Tests**
    - Screenshot comparison for visualization consistency
    - Tools: Percy, Chromatic

## Development Priorities

1. Core visualization engine with D3.js
2. Data loading and validation
3. Selection and filtering functionality
4. Interactive legend implementation
5. 3D structure visualization integration
6. Export and session management
7. UI refinement and responsive design
8. Performance optimizations for large datasets (future)
