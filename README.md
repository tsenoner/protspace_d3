# ProtSpace D3 Visualization

A web-based visualization tool for protein space data using D3.js and Vite.

## Features

-   Interactive scatter plot visualization of protein space
-   Dynamic feature selection and projection switching
-   Support for multiple shape and color mappings
-   JSON schema validation for data integrity

## Getting Started

### Prerequisites

-   Node.js (v14 or higher)
-   npm (comes with Node.js)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/protspace-d3-visualization.git
cd protspace-d3-visualization
```

2. Install dependencies:

```bash
pnpm install
```

3. Start the development server:

```bash
pnpm run dev
```

### Building for Production

To create a production build:

```bash
pnpm run build
```

## Project Structure

```
protspace_d3/
├── src/
│   └── main.js
├── data/
│   ├── schema.json
│   └── example.json
├── index.html

└── package.json
```

## Data Format

The visualization expects two JSON files:

-   `schema.json`: Defines the structure of the data
-   `example.json`: Contains the actual protein space data and visualization settings

## License

[Apache License 2.0](LICENSE)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.
