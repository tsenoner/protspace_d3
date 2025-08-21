# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Build & Development
- `pnpm dev` - Start scatterplot example in development mode with hot reloading
- `pnpm build` - Build all packages using Turborepo
- `pnpm test` - Run all tests across packages
- `pnpm lint` - Lint all packages 
- `pnpm type-check` - TypeScript type checking across workspace

### Package-Specific Development
- `turbo dev --filter=@protspace/core` - Work on core components only
- `turbo build test --filter=@protspace/react-bridge` - Build and test React bridge

### Release Management
- `pnpm changeset` - Create a changeset for version management
- `pnpm version-packages` - Update package versions from changesets
- `pnpm release` - Build and publish packages to npm

## Architecture Overview

ProtSpace is a monorepo for interactive protein space visualization components targeting bioinformatics research, focused on framework-agnostic web components.

### Core Components
- **Web Components** (`packages/core/`) - Framework-agnostic Lit components for scatterplot, interactive legend, and structure viewer using D3.js for direct DOM manipulation
- **React Bridge** (`packages/react-bridge/`) - React wrappers around web components  
- **Utilities** (`packages/utils/`) - Shared utilities for data processing, visualization, and structure handling
- **Example** (`examples/scatterplot-vite/`) - Standalone Vite example demonstrating core components

### Technology Stack
- **Monorepo**: Turborepo with pnpm workspaces
- **Framework**: Lit web components for framework-agnostic components
- **Visualization**: D3.js for data visualization
- **3D Structures**: Molstar integration for AlphaFold protein structures  
- **Styling**: Tailwind CSS with light DOM approach for web components
- **Validation**: Schema validation with strict JSON format requirements
- **Package Manager**: pnpm (required)

### Data Model
Proteins are visualized using:
- **Protein IDs**: Array of identifiers
- **Features**: Categorical data (function, localization, organism, etc.)
- **Feature Data**: Index-based mapping to feature values
- **Projections**: 2D coordinates from dimensionality reduction (UMAP, t-SNE, etc.)

### Key Architectural Decisions
- **Light DOM**: Web components use light DOM to enable Tailwind CSS styling
- **Direct D3 Integration**: D3.js manipulates DOM directly within components for performance
- **Stateless Application**: No browser storage, state managed through explicit save/load
- **Schema Validation**: Strict validation using provided JSON schema before visualization

## Development Guidelines

### Working with Components
- Prefer editing existing components over creating new files
- Follow existing patterns in `packages/core/src/components/`
- Use TypeScript interfaces for proper typing
- Maintain responsive design for desktop/tablet (no mobile targeting)

### Web Component Implementation
The project uses Lit-based web components for framework-agnostic visualization. See `docs/web-component-migration/README.md` for implementation details and patterns.

### Performance Considerations
- Handle datasets from ~100 to 1M+ proteins
- Use requestAnimationFrame for smooth rendering
- Implement spatial indexing for efficient hover/selection (future)
- Consider WebGL for very large datasets (future)

### Session Management
- Export/import session state as JSON files
- Include protein selections, legend customizations, and visual encodings
- Maintain backward compatibility across versions
- No authentication required - file-based sharing model

### Testing
Testing infrastructure uses Vitest for web components with component-specific testing strategies.