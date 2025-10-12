# Web Component Migration Plan for ProtSpace

This document outlines the plan for migrating core visualization components (scatterplot and interactive legend) from React to framework-agnostic web components using Lit.

## Why Web Components?

According to the ProtSpace specification, web components offer several advantages:

1. **Framework Agnosticism**: Web components work with any framework or no framework at all
2. **Performance**: Direct DOM manipulation with D3.js without Virtual DOM overhead
3. **Encapsulation**: Components can be developed and tested independently
4. **Reusability**: Components can be shared across different parts of the application or different projects

## Implementation Approach

### 1. Project Structure Updates

Create new packages in the monorepo structure:

```
packages/
  ├── scatter-plot/         # Scatterplot web component
  │   ├── package.json
  │   ├── tailwind.config.js
  │   └── src/
  │       ├── index.ts
  │       ├── scatter-plot.ts  # Main component
  │       └── utilities/       # D3 helpers
  │
  ├── interactive-legend/   # Legend web component
  │   ├── package.json
  │   ├── tailwind.config.js
  │   └── src/
  │       ├── index.ts
  │       └── interactive-legend.ts
```

### 2. Dependencies to Add

For each web component package:

```json
{
  "dependencies": {
    "lit": "^2.7.0",
    "d3": "^7.8.0"
  },
  "devDependencies": {
    "tailwindcss": "^3.3.0",
    "vite": "^4.3.0",
    "typescript": "^5.0.0"
  }
}
```

### 3. Light DOM Implementation

To ensure Tailwind CSS styles flow through to the component:

```typescript
@customElement('prot-scatter-plot')
export class ProtScatterPlot extends LitElement {
  // Use Light DOM instead of Shadow DOM
  createRenderRoot() {
    return this;
  }

  // Component implementation
}
```

### 4. Component API Design

Define clear property interfaces that match our current React props:

```typescript
@customElement('prot-scatter-plot')
export class ProtScatterPlot extends LitElement {
  // Data properties
  @property({ type: Array }) data = [];
  @property({ type: Number }) selectedProjectionIndex = 0;
  @property({ type: String }) selectedFeature = '';
  @property({ type: Array }) selectedProteinIds = [];
  @property({ type: Array }) highlightedProteinIds = [];
  @property({ type: Array }) hiddenFeatureValues = [];
  @property({ type: Boolean }) isolationMode = false;
  @property({ type: Boolean }) selectionMode = false;

  // Visual properties
  @property({ type: Number }) width = 800;
  @property({ type: Number }) height = 600;
  @property({ type: Number }) baseOpacity = 0.8;
  @property({ type: Number }) selectedOpacity = 1.0;
  @property({ type: Number }) fadedOpacity = 0.2;

  // Methods
  public resetView() {
    // Implementation
  }

  // Events
  private handleProteinClick(id: string) {
    this.dispatchEvent(
      new CustomEvent('protein-click', {
        detail: { proteinId: id },
        bubbles: true,
      })
    );
  }
}
```

### 5. D3.js Integration

Move the D3.js logic from React's useEffect to the web component's lifecycle methods:

```typescript
@customElement('prot-scatter-plot')
export class ProtScatterPlot extends LitElement {
  // Properties and setup

  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
  private zoomBehavior: d3.ZoomBehavior<SVGElement, unknown> | null = null;

  // Called when the element is first connected to the document
  connectedCallback() {
    super.connectedCallback();
    this.initializeSvg();
  }

  // Called when properties change
  updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);

    if (
      changedProperties.has('data') ||
      changedProperties.has('selectedProjectionIndex') ||
      changedProperties.has('selectedFeature')
    ) {
      this.updateVisualization();
    }
  }

  // D3 initialization
  private initializeSvg() {
    this.svg = d3.select(this.querySelector('svg'));
    // D3 setup code here
  }

  // Update visualization with D3
  private updateVisualization() {
    if (!this.svg || !this.data) return;

    // D3 update pattern here (similar to current React useEffect)
  }

  // Clean up on disconnect
  disconnectedCallback() {
    super.disconnectedCallback();
    // Clean up D3 references and listeners
  }

  // Render method
  render() {
    return html`
      <div class="relative w-full h-full">
        <svg
          width="${this.width}"
          height="${this.height}"
          class="bg-white border rounded-md shadow-sm dark:bg-gray-900 dark:border-gray-800"
        ></svg>
        <!-- Loading indicator -->
        <!-- Tooltip -->
      </div>
    `;
  }
}
```

### 6. Integration with React Application

Use the web components in the React app:

```tsx
// In React component
import '@protspace/scatter-plot';
import '@protspace/interactive-legend';

function VisualizationPage() {
  const handleProteinClick = (event) => {
    const { proteinId } = event.detail;
    // React state handling
  };

  return (
    <div>
      <prot-scatter-plot
        .data={visualizationData}
        .selectedProjectionIndex={selectedProjectionIndex}
        .selectedFeature={selectedFeature}
        .selectedProteinIds={selectedProteinIds}
        .highlightedProteinIds={highlightedProteinIds}
        .isolationMode={isolationMode}
        .selectionMode={selectionMode}
        @protein-click={handleProteinClick}
        @protein-hover={handleProteinHover}
      ></prot-scatter-plot>

      <prot-interactive-legend
        .featureData={featureData}
        .featureValues={featureValues}
        @toggle-visibility={handleToggleVisibility}
        @extract-from-other={handleExtractFromOther}
        @set-z-order={handleSetZOrder}
      ></prot-interactive-legend>
    </div>
  );
}
```

## Migration Strategy

The migration should be gradual and allow for parallel operation of both implementations:

1. **Implement Basic Web Components**: Create minimal versions that render data
2. **Add D3 Integration**: Port the D3.js visualization logic
3. **Add Events & Interactions**: Implement the interactive features
4. **Create Wrapper Components**: Build React wrappers around web components
5. **Test in Parallel**: Deploy both implementations side by side
6. **Gradual Replacement**: Switch to web components once feature parity is achieved

## Tailwind CSS Integration

To ensure Tailwind CSS works with web components:

1. Configure the component to use Light DOM instead of Shadow DOM
2. Use regular class names in the component templates
3. Ensure Tailwind is properly configured to scan web component files

Example Tailwind configuration:

```js
// tailwind.config.js for web component packages
module.exports = {
  content: ['./src/**/*.{js,ts}'],
  theme: {
    extend: {
      // Theme extensions
    },
  },
  plugins: [],
};
```

## Testing Strategy

1. **Unit Tests**: Test component properties and methods
2. **Visual Tests**: Test D3 rendering and interactions
3. **Integration Tests**: Test component events and callbacks
4. **Performance Tests**: Compare rendering performance against React implementation

## Timeline Estimate

1. **Setup & Scaffolding**: 1-2 days
2. **Scatterplot Web Component**: 3-4 days
3. **Interactive Legend Web Component**: 2-3 days
4. **Integration & Testing**: 2-3 days
5. **Documentation & Refinement**: 1-2 days

Total: 9-14 days for full migration
