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

```txt
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
├── examples/                    # Standalone examples
│   └── scatterplot-vite/        # Scatterplot example using Vite
│       ├── index.html
│       ├── src/main.ts
│       ├── package.json
│       └── vite.config.ts
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

## 📦 Package Overview

### Core Packages

#### `@protspace/core`

The main web components package built with [Lit](https://lit.dev/):

- **`<protspace-scatterplot>`** - Interactive scatter plot with D3.js canvas rendering
- **`<protspace-legend>`** - Customizable legend with filtering
- **`<protspace-data-loader>`** - Apache Arrow data loading and parsing

```html
<!-- Vanilla JavaScript usage -->
<protspace-scatterplot data="path/to/data.arrow" theme="scientific">
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
import { ScatterplotWrapper, useProtspaceData } from "@protspace/react";

function MyComponent() {
  const { data, selectPoint } = useProtspaceData(proteinData);

  return (
    <ScatterplotWrapper data={data} onPointSelect={selectPoint} theme="dark" />
  );
}
```

## 🛠️ Development

### Available Scripts

```bash
# Development
pnpm dev          # Start all packages in dev mode

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
```

### Development Workflow

1. **Start development mode**:

   ```bash
   pnpm dev
   ```

   This starts all packages in watch mode with hot reloading.

2. **Make changes** to components in `packages/core/src/components/`

3. **Test your changes**:

   ```bash
   pnpm test
   ```

4. **Build for production**:

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
  x: number; // X coordinate
  y: number; // Y coordinate
  category?: string; // Protein family/category
  color?: string; // Custom color
  size?: number; // Point size
  label?: string; // Display label
  metadata?: object; // Additional data
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
- **Examples**:
  - `examples/scatterplot-vite/`: Scatterplot demo using Vite. Run with `pnpm dev:example:scatterplot-vite`.
  - **🚀 Auto-Deploy to GitHub Pages**: The scatterplot example automatically deploys to GitHub Pages on push to main branch via GitHub Actions. Enable GitHub Pages in repository settings (source: GitHub Actions), then push changes to deploy. The workflow builds all workspace dependencies and deploys the example with sample protein data for immediate testing. Use `./scripts/deploy-example.sh` for local builds.
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
