# Using Web Components in Next.js

This guide explains how to use the Lit-based web components from your `@protspace/core` package in your Next.js application.

## Overview

Your project has both:

- **Lit-based web components** in `packages/core` (framework-agnostic)
- **React components** in the Next.js app (React-specific)

Web components offer several advantages:

- Framework agnostic (can be used in any framework)
- Encapsulated styling with Shadow DOM
- Consistent behavior across different parts of your application
- Easy to share between packages

## Setup

### 1. Build the Core Package

First, make sure your core package is built:

```bash
cd packages/core
npm run build
```

### 2. Import Web Components

The web components are automatically available in your Next.js app since `@protspace/core` is already listed as a dependency in `app/package.json`.

## Usage

### Basic Integration

Use the `ProtspaceWebComponent` wrapper to integrate Lit web components in React:

```tsx
import ProtspaceWebComponent from "@/components/WebComponent/ProtspaceWebComponent";

function MyPage() {
  return (
    <ProtspaceWebComponent
      data={visualizationData}
      selectedProjectionIndex={0}
      selectedFeature="protein_type"
      selectedProteinIds={selectedIds}
      highlightedProteinIds={highlightedIds}
      onProteinClick={handleProteinClick}
      onProteinHover={handleProteinHover}
    />
  );
}
```

### Event Handling

Web components emit custom events that are handled through the wrapper:

```tsx
const handleProteinClick = (proteinId: string, event?: CustomEvent) => {
  console.log("Protein clicked:", proteinId);
  // Handle protein selection
};

const handleProteinHover = (proteinId: string | null) => {
  console.log("Protein hovered:", proteinId);
  // Handle protein highlighting
};
```

### Available Props

The `ProtspaceWebComponent` wrapper accepts the following props:

| Prop                      | Type                         | Description                       |
| ------------------------- | ---------------------------- | --------------------------------- |
| `data`                    | `VisualizationData \| null`  | The visualization data            |
| `config`                  | `Partial<ScatterplotConfig>` | Configuration options             |
| `selectedProjectionIndex` | `number`                     | Index of the selected projection  |
| `selectedFeature`         | `string`                     | Name of the selected feature      |
| `highlightedProteinIds`   | `string[]`                   | Array of highlighted protein IDs  |
| `selectedProteinIds`      | `string[]`                   | Array of selected protein IDs     |
| `isolationMode`           | `boolean`                    | Whether isolation mode is enabled |
| `splitHistory`            | `string[][]`                 | History of split operations       |
| `selectionMode`           | `boolean`                    | Whether selection mode is enabled |
| `hiddenFeatureValues`     | `string[]`                   | Array of hidden feature values    |
| `onProteinClick`          | `Function`                   | Callback for protein click events |
| `onProteinHover`          | `Function`                   | Callback for protein hover events |
| `className`               | `string`                     | CSS class for the wrapper div     |

## Styling Web Components

### CSS Custom Properties

The web components use CSS custom properties for theming:

```css
protspace-scatterplot {
  --protspace-width: 100%;
  --protspace-height: 600px;
  --protspace-bg-color: #ffffff;
  --protspace-border-color: #e1e5e9;
  --protspace-point-size: 80px;
  --protspace-selection-color: #ff5500;
  --protspace-highlight-color: #3b82f6;
}
```

### Tailwind Integration

You can style the wrapper div with Tailwind classes:

```tsx
<ProtspaceWebComponent
  className="w-full h-96 border border-gray-300 rounded-lg"
  // ... other props
/>
```

## Advanced Usage

### Dynamic Loading

The wrapper uses dynamic imports to avoid SSR issues:

```tsx
// The component is automatically loaded dynamically
// No additional setup needed
```

### Multiple Web Components

You can use multiple web component instances:

```tsx
function Dashboard() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <ProtspaceWebComponent data={dataset1} selectedFeature="feature1" />
      <ProtspaceWebComponent data={dataset2} selectedFeature="feature2" />
    </div>
  );
}
```

## Demo Page

Visit `/web-components` in your Next.js app to see a live demonstration comparing React components vs Web components.

## Troubleshooting

### Web Component Not Loading

1. Ensure the core package is built: `npm run build` in `packages/core`
2. Check browser console for import errors
3. Verify the web component is registered in the DOM

### TypeScript Errors

The wrapper handles TypeScript integration. If you see errors:

1. Make sure `@protspace/core` types are available
2. Check that the wrapper component is imported correctly

### Styling Issues

1. Use CSS custom properties for theming
2. Check that styles aren't being overridden by global CSS
3. Use browser dev tools to inspect the Shadow DOM

## Benefits of Web Components

1. **Framework Agnostic**: Can be used in React, Vue, Angular, or vanilla JS
2. **Encapsulation**: Styles and behavior are isolated
3. **Reusability**: Same component works across different parts of your app
4. **Performance**: Optimized rendering with Lit
5. **Standards-Based**: Uses web platform standards

## Migration from React Components

To migrate from React components to web components:

1. Replace React component imports with the web component wrapper
2. Update prop names if needed (most props have the same names)
3. Update event handlers to work with custom events
4. Test functionality to ensure compatibility

## Next Steps

1. Build your core package regularly during development
2. Consider using web components for new features
3. Gradually migrate existing React components where it makes sense
4. Customize styling using CSS custom properties
5. Explore advanced Lit features like reactive properties and lifecycle methods
