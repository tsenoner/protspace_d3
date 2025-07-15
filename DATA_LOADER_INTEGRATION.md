# Apache Arrow Data Loader Integration

This document describes the integration of the Apache Arrow data loader web component into the ProtSpace application, which replaces the traditional Load Session feature with modern data loading capabilities.

## Overview

The `protspace-data-loader` web component has been integrated into the main ProtSpace application to provide:

- **Apache Arrow Support**: Native support for `.arrow`, `.parquet`, and `.feather` files
- **Drag & Drop Interface**: Modern file upload experience
- **Intelligent Column Mapping**: Automatic detection of protein IDs, coordinates, and features
- **Real-time Conversion**: Converts Arrow data to ProtSpace visualization format
- **Error Handling**: Comprehensive error reporting and validation

## Architecture Changes

### 1. Core Package Updates

**File**: `packages/core/src/index.ts`

- Added export for `data-loader` component
- Ensures the web component is available for import in the main app

**Dependencies**: `packages/core/package.json`

- Added `apache-arrow ^20.0.0` dependency
- Provides Arrow file processing capabilities

### 2. React Integration Components

**File**: `app/src/components/WebComponent/ProtspaceDataLoaderWebComponent.tsx`

- React wrapper for the `protspace-data-loader` web component
- Handles React-to-Web Component integration
- Manages component lifecycle and property updates
- Provides TypeScript interfaces for type safety

**File**: `app/src/components/DataLoaderModal/DataLoaderModal.tsx`

- Modal dialog containing the data loader
- Error handling and user feedback
- Help text with data format requirements
- Integration with main application state

### 3. Main Application Integration

**File**: `app/src/app/page.tsx`

- Added data loader modal state management
- Integrated Arrow data loading function
- Connected to Header component
- Resets application state when new data is loaded

**File**: `app/src/components/Header/Header.tsx`

- Added "Load Arrow Data" button next to "Load Session"
- New `onLoadData` prop for triggering data loader modal
- Maintains backward compatibility with existing session loading

## Data Flow

1. **User Interaction**: User clicks "Load Arrow Data" button in header
2. **Modal Opening**: `DataLoaderModal` opens with drag & drop interface
3. **File Selection**: User selects or drops an Arrow file
4. **Web Component Processing**: `protspace-data-loader` web component:
   - Reads the Arrow file using `apache-arrow` library
   - Automatically maps columns (protein_id, x/y coordinates, features)
   - Converts to ProtSpace `VisualizationData` format
   - Generates colors and shapes for categorical features
5. **Data Loading**: Converted data is passed to main application
6. **State Reset**: Application state is reset for the new dataset
7. **Visualization Update**: All components re-render with new data

## Supported File Formats

### Apache Arrow Files (.arrow)

- Native Arrow IPC format
- Most efficient for large datasets
- Preserves data types and metadata

### Parquet Files (.parquet)

- Columnar storage format
- Good compression and query performance
- Wide ecosystem support

### Feather Files (.feather)

- Language-agnostic format
- Fast read/write performance
- Good for data exchange

## Data Format Requirements

### Required Columns

The Arrow file must contain these essential columns:

1. **Protein ID Column** (auto-detected):

   - Column names: `protein_id`, `id`, `protein`, `uniprot`
   - Contains unique protein identifiers

2. **X Coordinate Column** (auto-detected):

   - Column names: `x`, `umap_1`, `pc1`, `tsne_1`
   - Numerical values for projection X-axis

3. **Y Coordinate Column** (auto-detected):
   - Column names: `y`, `umap_2`, `pc2`, `tsne_2`
   - Numerical values for projection Y-axis

### Optional Columns

Any additional columns become categorical features:

- Automatically processed as legend categories
- Unique values become legend items
- Colors and shapes automatically assigned
- Support for null/missing values

### Example Schema

```
protein_id: string        (Required - protein identifiers)
umap_1: float64          (Required - X coordinates)
umap_2: float64          (Required - Y coordinates)
function: string         (Optional - categorical feature)
organism: string         (Optional - categorical feature)
localization: string     (Optional - categorical feature)
family: string          (Optional - categorical feature)
expression_level: string (Optional - categorical feature)
```

## Output Format

The component converts Arrow data to ProtSpace's `VisualizationData` format:

```typescript
interface VisualizationData {
  protein_ids: string[];
  projections: {
    name: string;
    data: [number, number][];
  }[];
  features: Record<
    string,
    {
      values: (string | null)[];
      colors: string[];
      shapes: string[];
    }
  >;
  feature_data: Record<string, number[]>;
}
```

## Column Mapping Configuration

### Automatic Detection

The data loader intelligently maps columns using common naming patterns:

- **Protein IDs**: `protein_id` → `id` → `protein` → `uniprot`
- **X Coordinates**: `x` → `umap_1` → `pc1` → `tsne_1`
- **Y Coordinates**: `y` → `umap_2` → `pc2` → `tsne_2`

### Custom Mapping

For non-standard column names, you can provide custom mappings:

```typescript
<ProtspaceDataLoaderWebComponent
  columnMappings={{
    proteinId: "uniprot_accession",
    projection_x: "embedding_x",
    projection_y: "embedding_y",
    projectionName: "t-SNE",
  }}
/>
```

## Error Handling

The integration provides comprehensive error handling:

### File Format Errors

- Unsupported file formats
- Corrupted Arrow files
- Invalid Arrow schema

### Column Mapping Errors

- Missing required columns
- Invalid data types
- Empty datasets

### Data Validation Errors

- Non-numeric coordinates
- Duplicate protein IDs
- Invalid categorical values

## User Interface

### Header Integration

- New "Load Arrow Data" button with document icon
- Positioned next to existing "Load Session" button
- Tooltip: "Load Arrow Data"
- Maintains existing session loading functionality

### Modal Interface

- Clean, modern file drop zone
- Progress indication during loading
- Error messages with helpful guidance
- Format requirements help text
- Cancel option

## Performance Considerations

### Large Dataset Support

- Streaming Arrow file processing
- Progress indication for user feedback
- Efficient memory usage during conversion

### Web Component Lifecycle

- Proper cleanup on component unmount
- Event listener management
- Memory leak prevention

## Future Enhancements

### Planned Features

1. **Column Mapping UI**: Visual column mapping interface
2. **Data Preview**: Preview loaded data before applying
3. **Format Conversion**: Export to different formats
4. **Batch Loading**: Load multiple files simultaneously
5. **Cloud Integration**: Load from cloud storage services

### Integration Points

- Storybook documentation and examples
- Unit tests for data conversion
- E2E tests for user workflows
- Performance benchmarking

## Migration from JSON

### For Users

- Existing `.protspace` and `.json` files still work via "Load Session"
- New Arrow files provide better performance and features
- Gradual migration path available

### For Developers

- Arrow format provides better data integrity
- Schema validation at file level
- Better compression and loading performance
- Easier data pipeline integration

## Troubleshooting

### Common Issues

1. **Component Not Loading**

   - Ensure `@protspace/core` package is built
   - Check browser console for import errors
   - Verify web component registration

2. **File Not Accepted**

   - Check file extension (`.arrow`, `.parquet`, `.feather`)
   - Verify file is not corrupted
   - Ensure file contains required columns

3. **Column Mapping Failures**
   - Review column names in your Arrow file
   - Use custom column mappings if needed
   - Check for required data types

### Debug Information

Enable debug logging:

```javascript
// In browser console
window.localStorage.setItem("protspace-debug", "true");
```

This will provide detailed logging of:

- Column detection process
- Data conversion steps
- Error details
- Performance metrics

## Development Notes

### Building the Integration

```bash
# Build core package with data loader
cd packages/core
pnpm build

# Start development server
cd ../../
pnpm dev
```

### Testing

```bash
# Run component tests
cd packages/core
pnpm test

# Run integration tests
cd app
pnpm test
```

The integration maintains backward compatibility while providing a modern, efficient data loading experience for ProtSpace users.
