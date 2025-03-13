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

### Web Component Architecture

-   Core visualization components (scatterplot and interactive legend) implemented as framework-agnostic web components using Lit
-   Direct DOM manipulation for D3.js inside web components for optimal performance
-   Light DOM approach (rather than Shadow DOM) to enable Tailwind CSS styling
-   Rich, well-defined APIs for extensive customization from the parent React application

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

### Web Component Performance

-   Direct DOM manipulation by D3.js within web components (bypassing React's virtual DOM)
-   Use of requestAnimationFrame for smooth rendering
-   Handling high-frequency operations (e.g., panning, zooming) directly in the component
-   Efficient SVG rendering with element recycling for large datasets
-   View-based filtering for very large datasets (render only what's visible)

## Technical Implementation

### Architecture Approach

-   **Hybrid Architecture**:
    -   Core visualization components (scatterplot and legend) as web components using Lit
    -   Application shell and UI controls using React/Next.js
    -   This approach provides optimal performance for visualizations while maintaining React's ecosystem advantages

### Technology Stack

-   **Framework**:
    -   Next.js with React for application shell
    -   Lit for web components (visualization elements)
-   **Language**: TypeScript
-   **Visualization**: D3.js (directly manipulating DOM within web components)
-   **Styling**:
    -   Tailwind CSS for both React components and web components
    -   CSS custom properties for theme configuration
    -   Light DOM approach for web components to enable Tailwind styling
-   **Package Manager**: pnpm
-   **Monorepo Management**: Turborepo
-   **Code Quality**: ESLint
-   **Validation**: Zod.dev for schema validation

### Project Structure

```
protspace/
├── .eslintrc.js
├── .gitignore
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── packages/
│   ├── tailwind-config/           # Shared Tailwind configuration
│   │   ├── package.json
│   │   ├── tailwind.config.js     # Base configuration
│   │   └── theme.js               # Shared theme tokens
│   │
│   ├── schema/                    # Shared schema definitions
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts
│   │       └── validation.ts      # Zod schemas
│   │
│   ├── scatter-plot/              # Scatterplot web component
│   │   ├── package.json
│   │   ├── tailwind.config.js     # Extends shared config
│   │   └── src/
│   │       ├── index.ts
│   │       ├── scatter-plot.ts    # Main component
│   │       └── utilities/         # D3 helpers for scatterplot
│   │
│   ├── interactive-legend/        # Legend web component
│   │   ├── package.json
│   │   ├── tailwind.config.js     # Extends shared config
│   │   └── src/
│   │       ├── index.ts
│   │       └── interactive-legend.ts  # Main component
│   │
│   └── web-app/                   # Next.js React application
│       ├── next.config.js
│       ├── package.json
│       ├── tailwind.config.js     # Extends shared config
│       ├── app/                   # Next.js app router
│       ├── components/
│       │   ├── ui/                # Shadcn UI components
│       │   ├── layout/            # Application layout components
│       │   ├── controls/          # Control bar, search, etc.
│       │   └── 3d-viewer/         # Molstar integration
│       ├── lib/
│       │   ├── types/
│       │   ├── api/
│       │   └── state/             # Application state management
│       └── styles/
│
├── docs/                          # Documentation site
└── examples/                      # Example datasets and demos
```

### Component APIs

#### Scatter Plot Web Component API

Non-exhaustive example on how the APIs might look like.

```typescript
@customElement("prot-scatter-plot")
export class ProtScatterPlot extends LitElement {
    // Disable Shadow DOM to allow Tailwind styles to flow through
    createRenderRoot() {
        return this; // Use Light DOM instead of Shadow DOM
    }

    // Core Data Properties
    @property({ type: Array }) data = [];
    @property({ type: Array }) selectedProteinIds = [];
    @property({ type: Array }) highlightedProteinIds = [];
    @property({ type: String }) projectionName = "";

    // Visual Customization Properties
    @property({ type: Object }) dimensions = { width: 800, height: 600 };
    @property({ type: Object }) margins = {
        top: 10,
        right: 10,
        bottom: 10,
        left: 10,
    };
    @property({ type: Object }) featureStyles = {}; // Mapping of feature values to visual properties
    @property({ type: Number }) baseOpacity = 0.8;
    @property({ type: Number }) selectedOpacity = 1.0;
    @property({ type: Number }) fadedOpacity = 0.2;
    @property({ type: Boolean }) isolationMode = false;

    // Style Customization via Tailwind
    @property({ type: String }) containerClass = ""; // Additional Tailwind classes for container
    @property({ type: String }) pointClass = ""; // Tailwind classes for points
    @property({ type: String }) selectedPointClass = ""; // Tailwind classes for selected points
    @property({ type: String }) axisClass = ""; // Tailwind classes for axes

    // Theme Support
    @property({ type: String }) theme = "default"; // 'default', 'dark', 'light', 'custom'
    @property({ type: Object }) themeVariables = {}; // Custom theme variables

    // Methods for external control
    public zoomToSelection() {
        /* Implementation */
    }
    public resetView() {
        /* Implementation */
    }
    public updateProjection(projectionName) {
        /* Implementation */
    }

    // Events
    // protein-click, protein-hover, selection-changed, etc.
}
```

#### Interactive Legend Web Component API

```typescript
@customElement("prot-interactive-legend")
export class ProtInteractiveLegend extends LitElement {
    // Disable Shadow DOM to allow Tailwind styles to flow through
    createRenderRoot() {
        return this;
    }

    // Core Data Properties
    @property({ type: Object }) features = {};
    @property({ type: Object }) featureData = {};
    @property({ type: String }) selectedFeature = "";
    @property({ type: Array }) hiddenValues = [];

    // Customization Properties
    @property({ type: Number }) maxVisibleValues = 10;
    @property({ type: Boolean }) showCounts = true;

    // Style Customization via Tailwind
    @property({ type: String }) containerClass = "";
    @property({ type: String }) itemClass = "";
    @property({ type: String }) activeItemClass = "";
    @property({ type: String }) inactiveItemClass = "";
    @property({ type: String }) labelClass = "";
    @property({ type: String }) countClass = "";

    // Theme Support
    @property({ type: String }) theme = "default";
    @property({ type: Object }) themeVariables = {};

    // Methods
    public toggleFeatureValue(value) {
        /* Implementation */
    }
    public extractFromOther(value) {
        /* Implementation */
    }
    public setZOrder(valueOrder) {
        /* Implementation */
    }

    // Events
    // value-toggled, z-order-changed, etc.
}
```

### Styling Approach

#### Web Component Styling Strategy

-   **Light DOM Integration**: Web components use Light DOM to allow Tailwind styles to flow through
-   **Tailwind Integration**: Custom elements designed to accept Tailwind utility classes directly
-   **CSS Part Exposure**: Components expose named parts for targeted styling
-   **Theme Variables**: CSS custom properties for color schemes, sizing, and other visual attributes
-   **Minimal Base Styling**: Only essential styling is included by default, with most styling delegated to Tailwind

#### Tailwind Configuration

-   **Shared Configuration**: Core theme variables defined in a shared package
-   **Component-Specific Extensions**: Each web component extends the shared configuration
-   **Responsive Design**: Tailwind's responsive utilities available to all components
-   **Dark Mode Support**: Built-in support for light/dark theming

#### Style Customization Options

-   **Direct Class Injection**: Pass Tailwind classes directly to components
-   **Theme Properties**: Set `theme` property to predefined values ('default', 'dark', 'light')
-   **CSS Variables**: Set custom properties for fine-grained control
-   **Style Configuration Objects**: Structured configuration for complex styling needs

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

1. Core visualization engine with D3.js and web components
2. Data loading and validation
3. Selection and filtering functionality
4. Interactive legend implementation
5. 3D structure visualization integration
6. Export and session management
7. UI refinement and responsive design
8. Performance optimizations for large datasets (future)
```
