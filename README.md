# ProtSpace

Interactive protein space visualization web components for bioinformatics research.

> **Note**: This is a reimplementation of the ProtSpace tool described in the paper "ProtSpace: A Tool for Visualizing Protein Space" (Journal of Molecular Biology, 2025).

## 🧬 What is ProtSpace?

ProtSpace provides interactive visualization of protein embeddings from protein Language Models (pLMs) through **framework-agnostic web components**. The tool enables researchers to explore protein relationships in 2D/3D space using embeddings from models like ProtT5, with support for:

- **Canvas-based scatter plots** with D3.js for high-performance rendering
- **Interactive legends** with filtering and selection
- **Apache Arrow data loading** for efficient data handling
- **Customizable styling** and theming
- **Framework-agnostic web components** that work with any JavaScript framework or vanilla HTML

## 🏛️ Web Components Architecture

ProtSpace is built around **web components** using the [Lit](https://lit.dev/) framework, providing several key advantages:

### Why Web Components?

1. **Framework Agnosticism**: Components work seamlessly with React, Vue, Angular, Svelte, or vanilla JavaScript
2. **Performance**: Direct DOM manipulation with D3.js without Virtual DOM overhead
3. **Encapsulation**: Components are developed and tested independently with clear APIs
4. **Reusability**: Components can be shared across different projects and frameworks
5. **Future-Proof**: Built on web standards, ensuring long-term compatibility

### Component Architecture

```
Web Component Layer (Lit)
├── DOM Rendering & Lifecycle
├── Property/Event Management
├── Light DOM (for Tailwind CSS)
└── Custom Element Registration

Visualization Layer (D3.js)
├── Canvas/SVG Rendering
├── Data Binding & Updates
├── Interaction Handling
└── Animation & Transitions

Data Layer (Apache Arrow)
├── Efficient Data Loading
├── Memory Management
├── Type Safety
└── Cross-Language Compatibility
```

### Light DOM Implementation

ProtSpace components use **Light DOM** instead of Shadow DOM to ensure CSS frameworks like Tailwind work seamlessly:

```typescript
@customElement("protspace-scatterplot")
export class ProtSpaceScatterPlot extends LitElement {
  // Use Light DOM for Tailwind CSS compatibility
  createRenderRoot() {
    return this;
  }

  // Component implementation with full CSS access
}
```

## 🏗️ Repository Structure

This monorepo uses [Turborepo](https://turbo.build/) for efficient build caching and parallel execution. The architecture follows a clear separation of concerns:

```txt
protspace/
├── packages/
│   ├── core/                    # @protspace/core - Web Components
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── scatterplot/     # Main scatter plot component
│   │   │   │   │   ├── scatterplot.ts           # Lit web component
│   │   │   │   │   ├── scatterplot.stories.ts   # Storybook stories
│   │   │   │   │   ├── d3-renderer.ts           # D3.js visualization logic
│   │   │   │   │   └── types.ts                 # TypeScript interfaces
│   │   │   │   ├── legend/          # Interactive legend component
│   │   │   │   │   ├── legend.ts
│   │   │   │   │   ├── legend.stories.ts
│   │   │   │   │   └── legend-interactions.ts
│   │   │   │   └── data-loader/     # Arrow data loading component
│   │   │   │       ├── data-loader.ts
│   │   │   │       └── arrow-parser.ts
│   │   │   ├── styles/              # CSS and theming
│   │   │   │   ├── themes/          # Pre-built themes
│   │   │   │   ├── base.css         # Base component styles
│   │   │   │   └── tailwind.css     # Tailwind integration
│   │   │   ├── shared/              # Shared utilities and types
│   │   │   │   ├── events.ts        # Custom event definitions
│   │   │   │   ├── constants.ts     # Component constants
│   │   │   │   └── base-component.ts # Base web component class
│   │   │   └── index.ts             # Package exports
│   │   ├── tailwind.config.js       # Tailwind configuration
│   │   └── package.json
│   │
│   ├── utils/                   # @protspace/utils - Shared utilities
│   │   ├── src/
│   │   │   ├── arrow/               # Apache Arrow parsing
│   │   │   │   ├── parser.ts        # Arrow file parsing
│   │   │   │   ├── schema.ts        # Data schema definitions
│   │   │   │   └── validators.ts    # Data validation
│   │   │   ├── math/                # Mathematical operations
│   │   │   │   ├── clustering.ts    # Clustering algorithms
│   │   │   │   ├── dimensionality.ts # PCA, UMAP, t-SNE
│   │   │   │   └── statistics.ts    # Statistical functions
│   │   │   ├── visualization/       # Visualization utilities
│   │   │   │   ├── color-schemes.ts # Color palettes
│   │   │   │   ├── scales.ts        # D3 scale utilities
│   │   │   │   └── layouts.ts       # Layout algorithms
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── react-bridge/            # @protspace/react - React wrappers
│       ├── src/
│       │   ├── ScatterplotWrapper.tsx    # React wrapper for scatterplot
│       │   ├── LegendWrapper.tsx         # React wrapper for legend
│       │   ├── hooks/                    # React hooks
│       │   │   ├── useProtspaceData.ts   # Data management hook
│       │   │   ├── useSelection.ts       # Selection state hook
│       │   │   └── useVisualization.ts   # Visualization config hook
│       │   ├── types.ts                  # React-specific types
│       │   └── index.ts
│       └── package.json
│
├── apps/
│   └── src/
│       ├── app/                 # Next.js 14 app router
│       │   ├── page.tsx         # Main demo page
│       │   ├── components/      # App-specific components
│       │   └── layout.tsx       # App layout
│       ├── components/          # Existing components (migration phase)
│       │   └── legacy/          # Components being migrated
│       ├── data/                # Sample protein data
│       └── package.json
│
├── examples/                    # Standalone examples
│   ├── vanilla-html/            # Pure HTML/JS example
│   │   ├── index.html
│   │   ├── script.js
│   │   └── style.css
│   ├── scatterplot-vite/        # Vite-based example
│   │   ├── index.html
│   │   ├── src/main.ts
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── react-integration/       # React integration example
│       ├── src/App.tsx
│       ├── package.json
│       └── vite.config.ts
│
├── docs/                        # Documentation
│   ├── web-component-migration/ # Migration documentation
│   ├── components/              # Component API docs
│   └── architecture/            # Architecture documentation
│
├── turbo.json                   # Turborepo configuration
├── package.json                 # Root package scripts
└── pnpm-workspace.yaml         # Workspace configuration
```

### Package Dependencies Flow

```
@protspace/core (Web Components)
    ↓ depends on
@protspace/utils (Shared Utilities)

@protspace/react (React Bridge)
    ↓ depends on
@protspace/core + @protspace/utils

Next.js App
    ↓ depends on
@protspace/react (or directly @protspace/core)
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+
- **pnpm** 9+ (recommended) or npm
- **Git**

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/protspace.git
cd protspace

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start development
pnpm dev
```

The Next.js demo app will be available at `http://localhost:3000`.

## 📦 Package Overview

### Core Packages

#### `@protspace/core`

The main web components package built with [Lit](https://lit.dev/). These components are framework-agnostic and can be used in any web application:

**Components:**

- **`<protspace-scatterplot>`** - Interactive scatter plot with D3.js canvas rendering
- **`<protspace-legend>`** - Customizable legend with filtering and interaction
- **`<protspace-data-loader>`** - Apache Arrow data loading and parsing

**Key Features:**

- Light DOM implementation for CSS framework compatibility
- Custom events for framework integration
- TypeScript support with full type definitions
- Accessibility features built-in
- Performance optimized with D3.js direct DOM manipulation

```html
<!-- Vanilla JavaScript usage -->
<protspace-scatterplot
  .data="${proteinData}"
  .selectedProjectionIndex="${0}"
  .selectedFeature="${'family'}"
  width="800"
  height="600"
  theme="scientific"
>
</protspace-scatterplot>

<script>
  const scatterplot = document.querySelector("protspace-scatterplot");

  // Listen to component events
  scatterplot.addEventListener("protein-click", (event) => {
    console.log("Protein clicked:", event.detail.proteinId);
  });

  scatterplot.addEventListener("protein-hover", (event) => {
    console.log("Protein hovered:", event.detail.proteinId);
  });
</script>
```

**Component API Design:**

```typescript
// Property-based configuration
@property({ type: Array }) data = [];
@property({ type: Number }) selectedProjectionIndex = 0;
@property({ type: String }) selectedFeature = "";
@property({ type: Array }) selectedProteinIds = [];
@property({ type: Array }) highlightedProteinIds = [];
@property({ type: Boolean }) isolationMode = false;
@property({ type: Boolean }) selectionMode = false;

// Visual properties
@property({ type: Number }) width = 800;
@property({ type: Number }) height = 600;
@property({ type: Number }) baseOpacity = 0.8;
@property({ type: Number }) selectedOpacity = 1.0;
@property({ type: Number }) fadedOpacity = 0.2;

// Custom events
this.dispatchEvent(new CustomEvent('protein-click', {
  detail: { proteinId: id },
  bubbles: true
}));
```

#### `@protspace/utils`

Shared utilities for data processing and visualization:

- **Arrow parsing** - Efficient loading of protein data with schema validation
- **Math utilities** - Clustering, PCA, UMAP implementations optimized for protein data
- **Visualization helpers** - Color schemes, scales, layouts designed for scientific visualization

#### `@protspace/react`

React wrappers and hooks for seamless React integration. These provide a React-friendly API while leveraging the underlying web components:

```tsx
import {
  ScatterplotWrapper,
  useProtspaceData,
  useSelection,
} from "@protspace/react";

function ProteinVisualization() {
  const { data, loading, error } = useProtspaceData(
    "/path/to/protein-data.arrow"
  );
  const { selectedIds, selectProtein, clearSelection } = useSelection();

  return (
    <div className="protein-visualization">
      <ScatterplotWrapper
        data={data}
        selectedProteinIds={selectedIds}
        onProteinClick={selectProtein}
        onProteinHover={(id) => console.log("Hover:", id)}
        theme="dark"
        isolationMode={false}
        selectionMode={true}
        className="w-full h-96"
      />
    </div>
  );
}
```

**React Hooks:**

```tsx
// Data management
const { data, loading, error, refetch } = useProtspaceData(dataSource, options);

// Selection state
const {
  selectedIds,
  selectProtein,
  deselectProtein,
  toggleSelection,
  clearSelection,
} = useSelection();

// Visualization configuration
const { theme, setTheme, projectionIndex, setProjectionIndex } =
  useVisualization();
```

## 🛠️ Development

### Available Scripts

```bash
# Development
pnpm dev          # Start all packages in dev mode
pnpm dev:app      # Start only the Next.js app
pnpm dev:core     # Start only core components
pnpm dev:storybook # Start Storybook for component development

# Building
pnpm build        # Build all packages
pnpm build:core   # Build only core components
pnpm build:react  # Build only React bridge

# Testing
pnpm test         # Run all tests
pnpm test:watch   # Run tests in watch mode
pnpm test:ui      # Run tests with UI

# Linting & Formatting
pnpm lint         # Lint all packages
pnpm format       # Format code with Prettier
pnpm type-check   # TypeScript type checking
```

### Working with Specific Packages

Turborepo allows you to work efficiently with specific packages:

```bash
# Work on core components only
turbo dev --filter=@protspace/core

# Build and test React bridge
turbo build test --filter=@protspace/react

# Work on Next.js app with its dependencies
turbo dev --filter=nextjs-app

# Work on everything except examples
turbo dev --filter=!examples
```

### Development Workflow

1. **Start development mode**:

   ```bash
   pnpm dev
   ```

   This starts all packages in watch mode with hot reloading.

2. **Component Development**: Use Storybook for isolated component development:

   ```bash
   pnpm dev:storybook
   ```

3. **Make changes** to components in `packages/core/src/components/`

4. **See changes reflected** immediately in:

   - Storybook at `localhost:6006`
   - Next.js app at `localhost:3000`
   - Any example apps you're running

5. **Test your changes**:

   ```bash
   pnpm test
   ```

6. **Build for production**:

   ```bash
   pnpm build
   ```

## 🎨 Styling & Theming

ProtSpace components use CSS Custom Properties for flexible theming and work seamlessly with Tailwind CSS:

### Custom Themes

```css
/* Custom theme using CSS custom properties */
protspace-scatterplot {
  --protspace-bg-primary: #1a202c;
  --protspace-text-primary: #f7fafc;
  --protspace-point-size: 6px;
  --protspace-selection-color: #63b3ed;
  --protspace-hover-color: #90cdf4;
  --protspace-grid-color: #2d3748;
  --protspace-axis-color: #4a5568;
}
```

### Built-in Themes

- `light` - Clean light theme optimized for general use
- `dark` - Dark mode optimized for reduced eye strain
- `scientific` - Publication-ready styling with high contrast
- `colorblind` - Accessibility optimized with colorblind-safe palettes

### Tailwind CSS Integration

Components use Light DOM to ensure Tailwind classes work seamlessly:

```html
<protspace-scatterplot
  class="w-full h-96 border border-gray-300 rounded-lg shadow-lg"
>
</protspace-scatterplot>
```

The components' internal styling also uses Tailwind classes:

```typescript
render() {
  return html`
    <div class="relative w-full h-full bg-white dark:bg-gray-900">
      <svg class="absolute inset-0 w-full h-full"></svg>
      <div class="absolute top-4 right-4 z-10">
        <button class="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600">
          Reset View
        </button>
      </div>
    </div>
  `;
}
```

## 📊 Data Format

ProtSpace uses Apache Arrow for efficient data loading and processing:

### Data Structure

```typescript
interface ProteinDataPoint {
  // Coordinates (required)
  x: number; // X coordinate (e.g., from UMAP/PCA)
  y: number; // Y coordinate
  z?: number; // Z coordinate for 3D visualization

  // Identifiers (required)
  protein_id: string; // UniProt ID or custom identifier

  // Classification (optional)
  family?: string; // Protein family classification
  superfamily?: string; // Protein superfamily
  organism?: string; // Taxonomic information

  // Functional annotation (optional)
  function?: string; // Functional annotation
  go_terms?: string[]; // Gene Ontology terms

  // Visualization properties (optional)
  color?: string; // Custom color override
  size?: number; // Point size override
  label?: string; // Display label

  // Additional metadata
  metadata?: {
    confidence?: number; // Embedding confidence
    cluster_id?: number; // Cluster assignment
    [key: string]: any; // Custom properties
  };
}
```

### Example Arrow File Loading

```typescript
// Using the data loader component
<protspace-data-loader
  src="/data/protein-embeddings.arrow"
  @data-loaded="${this.handleDataLoaded}">
</protspace-data-loader>

// Programmatic loading
import { loadArrowData } from '@protspace/utils';

const data = await loadArrowData('/data/protein-embeddings.arrow');
console.log('Loaded', data.length, 'protein data points');
```

### Data Preparation

For optimal performance, ensure your Arrow files include:

1. **Proper schema definition** with correct data types
2. **Indexed columns** for frequently filtered fields
3. **Chunked data** for large datasets (>100k points)
4. **Metadata headers** with data source information

```python
# Example Python script to create Arrow file
import pyarrow as pa
import pandas as df

# Prepare data
df = pd.DataFrame({
    'x': embeddings[:, 0],
    'y': embeddings[:, 1],
    'protein_id': protein_ids,
    'family': families,
    'organism': organisms
})

# Create Arrow table with proper schema
schema = pa.schema([
    ('x', pa.float64()),
    ('y', pa.float64()),
    ('protein_id', pa.string()),
    ('family', pa.string()),
    ('organism', pa.string())
])

table = pa.Table.from_pandas(df, schema=schema)
pa.parquet.write_table(table, 'protein-embeddings.arrow')
```

## 🧪 Testing

The project uses [Vitest](https://vitest.dev/) for testing:

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with UI
pnpm test:ui

# Test specific package
turbo test --filter=@protspace/core
```

## 📚 Documentation

- **Components**: See `docs/components/` for detailed component APIs
- **Examples**:
  - `examples/scatterplot-vite/`: Scatterplot demo using Vite. Run with `pnpm dev:example:scatterplot-vite`.
  - Check `examples/` for other usage examples (as they are added).
- **Migration Guide**: `docs/migration-guide.md` for migrating from existing implementations

## 🚢 Publishing

This monorepo uses [Changesets](https://github.com/changesets/changesets) for version management:

```bash
# Create a changeset
pnpm changeset

# Version packages
pnpm version-packages

# Publish to npm
pnpm release
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests for new functionality
5. Run tests: `pnpm test`
6. Create a changeset `pnpm changeset`
7. Commit changes: `git commit -m 'Add amazing feature'` ([Note on Commit Messages](https://gist.github.com/robertpainsi/b632364184e70900af4ab688decf6f53))
8. Push to branch: `git push origin feature/amazing-feature`
9. Open a Pull Request

## 📄 License

This project is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Lit](https://lit.dev/) for web components framework
- [D3.js](https://d3js.org/) for visualization capabilities
- [Apache Arrow](https://arrow.apache.org/) for efficient data handling
- [Turborepo](https://turbo.build/) for monorepo tooling

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-username/protspace/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/protspace/discussions)
- **Documentation**: [GitHub Wiki](https://github.com/your-username/protspace/wiki)

## 📖 Component Development with Storybook

We use [Storybook](https://storybook.js.org/) for developing and showcasing UI components in isolation. This is particularly useful for the web components in the `@protspace/core` package.

Storybook allows you to:

- View components in different states and with various props.
- Interact with components dynamically through controls.
- Get an overview of the available components and their usage.

### Running Storybook for `@protspace/core`

To start Storybook for the `@protspace/core` components:

```bash
# Navigate to the core package if you aren't already there (optional)
# cd packages/core

# Run the storybook script from the root or within packages/core
pnpm --filter @protspace/core storybook
```

This will typically open Storybook in your browser at `http://localhost:6006`.

### Writing Stories

Stories are defined in `*.stories.ts` files alongside the components (e.g., `packages/core/src/components/scatterplot/scatterplot.stories.ts`). Each story represents a specific state or use case of a component.

## 🦋 Managing Releases with Changesets

This project uses [Changesets](https://github.com/changesets/changesets) to manage versioning, changelogs, and publishing of packages. Changesets help ensure that all changes are properly documented and that package versions are incremented correctly based on the [semver](https://semver.org/) specification.

### How it Works

When you make a change to a package that you intend to be part of a release, you should add a "changeset" file. This file captures your intent:

- Which packages are affected.
- Whether the change is a `patch`, `minor`, or `major` update for each affected package.
- A short description of the change, which will be used to compile the changelog.

### Adding a Changeset

1. After making your code changes, run the following command:

   ```bash
   pnpm changeset add
   ```

2. Changesets will then prompt you to:

   - Select which packages have been changed (use spacebar to select, enter to confirm).
   - Specify the semver bump type (patch, minor, major) for each selected package.
   - Write a summary of the changes. This summary will be included in the changelogs.

   This process will create a new markdown file in the `.changeset` directory at the root of the project.

3. Commit this generated markdown file along with your code changes.

### Releasing Packages

When it's time to release:

1. **Versioning**: The release process will consume all changeset files to determine the new versions for the packages.

   ```bash
   pnpm changeset version
   # or npx changeset version
   ```

   This command updates the `package.json` versions of the changed packages and updates their changelog files (e.g., `CHANGELOG.md`).

2. **Publishing**: After versions are bumped and changelogs are updated, you can publish the packages.

   ```bash
   pnpm changeset publish
   # or npx changeset publish
   ```

   This will publish the packages that have been updated in the `version` step to the configured NPM registry.

   (Typically, these `version` and `publish` steps are part of an automated CI/CD release pipeline after merging changes to a main branch.)

### Important Notes

- **Add changesets early and often**: It's best to add a changeset as part of the same commit where the actual code changes are made.
- **Be descriptive**: Good changeset messages lead to good changelogs.
