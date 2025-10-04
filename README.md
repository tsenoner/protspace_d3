# ProtSpace_d3

Framework-agnostic web components for visualizing protein spaces in the browser.

> This repository provides the Web Components that render ProtSpace visualizations. To visualize your own data, first generate `.parquetbundle` files with the Python ProtSpace toolkit, then open them here.

> This is a reimplementation of the ProtSpace tool described in the paper "ProtSpace: A Tool for Visualizing Protein Space" (Journal of Molecular Biology, 2025).

## 🧬 What this ProtSpace_d3? 

ProtSpace d3 is a set of custom elements you can drop into any website or app to get the ProtSpace visualization experience. It ships a high-performance scatter plot, an interactive legend, a control bar, and a data loader that accepts ParquetBundle files.

## 🚀 Key features

- High-performance canvas scatter plot with zoom, pan, and selection
- Color by any feature and toggle visibility from the legend
- Drag & drop `.parquetbundle` files; large-file optimized loading
- Export PNG/PDF/JSON and selected protein IDs
- Works with any framework (native Web Components)

## 🛠️ Prepare your data (Python ProtSpace)

Use the Python toolkit to compute projections and produce ParquetBundle output, then load those files here for visualization.

```bash
pip install protspace

# Query UniProt directly and generate a parquet bundle file.
protspace-query -q "(ft_domain:phosphatase) AND (reviewed:true)" -o output_dir -m pca2,pca3,umap2 -f "protein_families,fragment,kingdom,superfamily"

# Or use your own generated embeddings
protspace-local -i embeddings.h5 -o output_dir -m pca2,umap2 -f "protein_families,fragment,kingdom,superfamily"
```

Check the ProtSpace python library [here](https://github.com/tsenoner/protspace)

## 📊 Visualize it with ProtSpace_d3

```bash
# Clone and install
git clone git@github.com:tsenoner/protspace_d3.git
cd protspace_d3
pnpm i

# Start the example app
pnpm dev
```

This starts a local demo (Vite) showing how the components work together. You can drag & drop a `.parquetbundle` file to visualize it.

## 💻 Use in your website

Add the components, import the library, and wire the loader to the plot.

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>ProtSpace</title>
    <script type="module">
      import '@protspace/core';
    </script>
    <style>
      protspace-scatterplot { display:block; height:600px; }
    </style>
  </head>
  <body>
    <protspace-control-bar auto-sync scatterplot-selector="protspace-scatterplot"></protspace-control-bar>
    <protspace-legend auto-sync scatterplot-selector="protspace-scatterplot"></protspace-legend>
    <protspace-data-loader id="loader" allow-drop></protspace-data-loader>
    <protspace-scatterplot id="plot"></protspace-scatterplot>

    <script type="module">
      const loader = document.getElementById('loader');
      const plot = document.getElementById('plot');
      loader.addEventListener('data-loaded', (e) => {
        plot.data = e.detail.data;
        plot.selectedProjectionIndex = 0;
        plot.selectedFeature = Object.keys(e.detail.data.features)[0] || '';
      });
      // Or load from URL: <protspace-data-loader src="/path/to/file.parquetbundle" auto-load></protspace-data-loader>
    </script>
  </body>
  </html>
```

### Components at a glance

- `protspace-data-loader`: Loads `.parquetbundle` and emits `data-loaded`
- `protspace-scatterplot`: High-performance 2D plot driven by `data`
- `protspace-legend`: Filter, isolate, re‑order categories; auto-sync with plot
- `protspace-control-bar`: Switch projection/plane/feature; toggle selection; export

## Styling

Customize via CSS variables on the elements, for example:

```css
protspace-scatterplot {
  --protspace-bg-primary: #ffffff;
  --protspace-text-primary: #111827;
}
```

## Development (optional)

```bash
pnpm dev          # run the example
pnpm build        # build all packages
pnpm build:core   # build only @protspace/core
pnpm test         # run tests
```

## License

See [LICENSE](LICENSE).
