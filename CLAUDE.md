# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Build & Development
- `pnpm dev` - Start all packages in development mode with hot reloading
- `pnpm dev:app` - Start only the Next.js app at `localhost:3000`
- `pnpm build` - Build all packages using Turborepo
- `pnpm test` - Run all tests across packages
- `pnpm lint` - Lint all packages 
- `pnpm type-check` - TypeScript type checking across workspace

### Package-Specific Development
- `turbo dev --filter=@protspace/core` - Work on core components only
- `turbo build test --filter=@protspace/react` - Build and test React bridge
- `pnpm dev:example:scatterplot-vite` - Run standalone Vite example

### Release Management
- `pnpm changeset` - Create a changeset for version management
- `pnpm version-packages` - Update package versions from changesets
- `pnpm release` - Build and publish packages to npm

## Architecture Overview

ProtSpace is a monorepo for interactive protein space visualization components targeting bioinformatics research. The architecture follows a hybrid approach:

### Core Components (Future/Planned)
- **Web Components** (`@protspace/core`) - Framework-agnostic Lit components for scatterplot and interactive legend using D3.js for direct DOM manipulation
- **React Bridge** (`@protspace/react`) - React wrappers around web components

### Current Implementation
- **Next.js App** (`app/`) - Main demonstration application with React components
- **Components**: Header, ControlBar, Scatterplot, InteractiveLegend, StructureViewer, StatusBar
- **Data Format**: JSON schema for protein data with projections, features, and feature data

### Technology Stack
- **Monorepo**: Turborepo with pnpm workspaces
- **Framework**: Next.js 15 with React 19
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
- Follow existing patterns in `app/src/components/`
- Use TypeScript interfaces for proper typing
- Maintain responsive design for desktop/tablet (no mobile targeting)

### Web Component Migration
The project is planning migration to web components. See `docs/web-component-migration/README.md` for detailed migration strategy using Lit framework.

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
Current testing infrastructure uses standard Next.js/React tooling. Future web components will use Vitest and component-specific testing strategies.