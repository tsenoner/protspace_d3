# ProtSpace D3 Visualization

A web-based visualization tool for protein space data using D3.js and Next.js.

## Features

-   Interactive scatter plot visualization of protein space
-   Dynamic feature selection and projection switching
-   Support for multiple shape and color mappings
-   JSON schema validation for data integrity
-   Built with modern React and TypeScript

## Getting Started

### Prerequisites

-   Node.js (v18 or higher)
-   pnpm (v8 or higher)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/rostlab/protspace_d3.git
cd protspace_d3
```

2. Install dependencies:

```bash
pnpm install
```

3. Start the development server:

```bash
pnpm run dev
```

The application will be available at `http://localhost:3000`.

### Production Deployment

To create and run a production build:

```bash
# Build the application
pnpm run build

# Start the production server
pnpm start
```

## Project Structure

```
protspace_d3/
├── public/
│   ├── data/
│   │   ├── schema.json    # Data structure definition
│   │   └── example.json   # Sample visualization data
│   ├── rostlabLogo.svg    # RostLab branding
│   ├── protspaceLogo.svg  # Application logo
│   └── favicon.ico        # Browser icon
├── src/
│   ├── app/              # Next.js app router
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Main page
│   └── components/       # React components
│       ├── Scatterplot.tsx
│       └── Scatterplot.module.css
└── package.json
```

## Data Format

The visualization requires two JSON files:

### schema.json
Defines the structure of the data including:
- Protein identifiers
- Feature definitions with values, colors, and shapes
- Projection data format
- Metadata requirements

### example.json
Contains the actual visualization data:
- Protein IDs
- Feature mappings
- Projection coordinates
- Visual style definitions

## License

[Apache License 2.0](LICENSE)

## Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details.
