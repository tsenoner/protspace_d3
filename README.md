# ProtSpace

Interactive protein space visualization web components for bioinformatics research.

> **Note**: This is a reimplementation of the ProtSpace tool described in the paper "ProtSpace: A Tool for Visualizing Protein Space" (Journal of Molecular Biology, 2025).

## 🧬 What is ProtSpace?

ProtSpace provides interactive visualization of protein embeddings from protein Language Models (pLMs) through web components. The tool enables researchers to explore protein relationships in 2D/3D space using embeddings from models like ProtT5, with support for:

- **Canvas-based scatter plots** with D3.js for high-performance rendering
- **Interactive legends** with filtering and selection
- **Apache Arrow data loading** for efficient data handling
- **Customizable styling** and theming
- **Framework-agnostic web components** that work with any JavaScript framework

## 🏗️ Repository Structure

This monorepo uses [Turborepo](https://turbo.build/) for efficient build caching and parallel execution:

```
protspace/
├── packages/
│   ├── core/                    # @protspace/core - Web components
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── scatterplot/     # Main scatter plot component
│   │   │   │   ├── legend/          # Interactive legend component
│   │   │   │   └── data-loader/     # Arrow data loading component
│   │   │   ├── styles/              # CSS and theming
│   │   │   ├── shared/              # Shared utilities and types
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── utils/                   # @protspace/utils - Shared utilities
│   │   ├── src/
│   │   │   ├── arrow/               # Apache Arrow parsing
│   │   │   ├── math/                # Clustering, dimensionality reduction
│   │   │   ├── visualization/       # Color schemes, scales
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── react-bridge/            # @protspace/react - React wrappers
│       ├── src/
│       │   ├── ScatterplotWrapper.tsx
│       │   ├── LegendWrapper.tsx
│       │   ├── hooks/               # React hooks
│       │   └── index.ts
│       └── package.json
│
├── apps/
│   └── nextjs-app/              # Demo Next.js application
│       ├── src/
│       │   ├── app/                 # Next.js 14 app router
│       │   ├── components/
│       │   │   ├── legacy/          # Existing components (migration)
│       │   │   ├── hybrid/          # New components using web components
│       │   │   └── ui/              # UI components
│       │   └── lib/                 # Utilities and sample data
│       └── package.json
│
├── turbo.json                   # Turborepo configuration
├── package.json                 # Root package scripts
└── pnpm-workspace.yaml         # Workspace configuration
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
The main web components package built with [Lit](https://lit.dev/):

- **`<protspace-scatterplot>`** - Interactive scatter plot with D3.js canvas rendering
- **`<protspace-legend>`** - Customizable legend with filtering
- **`<protspace-data-loader>`** - Apache Arrow data loading and parsing

```html
<!-- Vanilla JavaScript usage -->
<protspace-scatterplot 
  data="path/to/data.arrow"
  theme="scientific">
</protspace-scatterplot>
```

#### `@protspace/utils`
Shared utilities for data processing and visualization:

- **Arrow parsing** - Efficient loading of protein data
- **Math utilities** - Clustering, PCA, UMAP implementations  
- **Visualization helpers** - Color schemes, scales, layouts

#### `@protspace/react`
React wrappers and hooks for seamless React integration:

```tsx
import { ScatterplotWrapper, useProtspaceData } from '@protspace/react';

function MyComponent() {
  const { data, selectPoint } = useProtspaceData(proteinData);
  
  return (
    <ScatterplotWrapper 
      data={data} 
      onPointSelect={selectPoint}
      theme="dark"
    />
  );
}
```

## 🛠️ Development

### Available Scripts

```bash
# Development
pnpm dev          # Start all packages in dev mode
pnpm dev:app      # Start only the Next.js app
pnpm dev:core     # Start only core components

# Building
pnpm build        # Build all packages
pnpm build:core   # Build only core components

# Testing
pnpm test         # Run all tests
pnpm test:watch   # Run tests in watch mode

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

# Work on everything except demo
turbo dev --filter=!demo
```

### Development Workflow

1. **Start development mode**:
   ```bash
   pnpm dev
   ```
   This starts all packages in watch mode with hot reloading.

2. **Make changes** to components in `packages/core/src/components/`

3. **See changes reflected** immediately in the Next.js app at `localhost:3000`

4. **Test your changes**:
   ```bash
   pnpm test
   ```

5. **Build for production**:
   ```bash
   pnpm build
   ```

## 🎨 Styling & Theming

ProtSpace components use CSS Custom Properties for flexible theming:

```css
/* Custom theme */
protspace-scatterplot {
  --protspace-bg-primary: #1a202c;
  --protspace-text-primary: #f7fafc;
  --protspace-point-size: 6px;
  --protspace-selection-color: #63b3ed;
}
```

Built-in themes:
- `light` - Clean light theme
- `dark` - Dark mode optimized
- `scientific` - Publication-ready styling
- `colorblind` - Accessibility optimized

## 📊 Data Format

ProtSpace uses Apache Arrow for efficient data loading:

```typescript
interface DataPoint {
  x: number;              // X coordinate
  y: number;              // Y coordinate  
  category?: string;      // Protein family/category
  color?: string;         // Custom color
  size?: number;          // Point size
  label?: string;         // Display label
  metadata?: object;      // Additional data
}
```

Example Arrow file structure:
- `x`, `y` - Embedding coordinates (e.g., from UMAP/PCA)
- `protein_id` - UniProt ID or identifier
- `family` - Protein family classification
- `organism` - Taxonomic information
- `function` - Functional annotation

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
- **Examples**: Check `examples/` for usage examples in different frameworks
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
6. Commit changes: `git commit -m 'Add amazing feature'`
7. Push to branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Original ProtSpace paper and authors
- [Lit](https://lit.dev/) for web components framework
- [D3.js](https://d3js.org/) for visualization capabilities
- [Apache Arrow](https://arrow.apache.org/) for efficient data handling
- [Turborepo](https://turbo.build/) for monorepo tooling

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-username/protspace/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/protspace/discussions)
- **Documentation**: [GitHub Wiki](https://github.com/your-username/protspace/wiki)