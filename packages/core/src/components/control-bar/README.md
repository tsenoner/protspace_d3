# Control Bar Component

Clean architecture with proper separation of concerns for maintainability and testability.

## 📁 Folder Structure

```
control-bar/
├── lib/                    # Business Logic (Pure TypeScript)
│   ├── index.ts           # Clean API exports
│   ├── types.ts           # Type definitions
│   ├── control-bar-logic.ts      # Core business logic
│   ├── control-bar-events.ts     # Event management
│   └── control-bar-state.ts      # State management
├── ui/                     # User Interface (LitElement)
│   ├── index.ts           # UI exports
│   ├── control-bar-ui.ts         # Main UI component
│   └── control-bar.styles.ts     # Component styles
├── control-bar.ts         # Main export (backward compatible)
└── README.md              # This file
```

## 🏗️ Architecture Principles

### **lib/** - Business Logic Layer
- **Pure TypeScript** - No DOM or UI dependencies
- **Testable** - Can be unit tested without rendering
- **Reusable** - Can be used in other components or frameworks
- **Single Responsibility** - Each file has one clear purpose

### **ui/** - User Interface Layer  
- **Pure UI** - Only handles rendering and user interactions
- **Delegates** - All business logic delegated to lib layer
- **Framework Specific** - Uses LitElement for web components

## 📚 Usage

### Basic Usage (Backward Compatible)
```typescript
import { ProtspaceControlBar } from './control-bar';

// Works exactly the same as before
const controlBar = document.createElement('protspace-control-bar');
```

### Advanced Usage - Using Business Logic Directly
```typescript
import { 
  ControlBarLogic, 
  ControlBarStateManager, 
  ControlBarEventManager 
} from './control-bar';

// Use business logic in your own components
const logic = new ControlBarLogic();
const stateManager = new ControlBarStateManager();
const eventManager = new ControlBarEventManager(element);

// Pure business logic - perfect for testing
const data = logic.getCurrentData();
const filteredData = logic.applyFilters(data, filterConfig);

// Reactive state management
stateManager.subscribe(state => {
  console.log('State changed:', state);
});
```

### Custom UI Implementation
```typescript
import { ControlBarLogic, ControlBarState } from './lib';
import { controlBarStyles } from './ui';

// Create your own UI using the business logic
class CustomControlBar extends LitElement {
  private logic = new ControlBarLogic();
  
  render() {
    // Your custom UI here
    // Business logic available via this.logic
  }
}
```

## ✅ Benefits

1. **Maintainable** - Clear separation makes changes easier
2. **Testable** - Business logic can be tested without DOM
3. **Reusable** - Logic can be used in different UI frameworks
4. **Scalable** - Easy to add new features without breaking existing code
5. **Type Safe** - Full TypeScript support with proper interfaces

## 🧪 Testing

```typescript
// Test business logic without UI
import { ControlBarLogic } from './lib';

describe('ControlBarLogic', () => {
  it('should filter data correctly', () => {
    const logic = new ControlBarLogic();
    const result = logic.applyFilters(testData, filterConfig);
    expect(result).toMatchSnapshot();
  });
});
```

## 🔄 Migration from Legacy

The new architecture is **100% backward compatible**. Existing code continues to work unchanged:

```typescript
// This still works exactly the same
import { ProtspaceControlBar } from './control-bar';
```

But you can now also access the separated concerns for advanced usage:

```typescript
// New capabilities
import { ControlBarLogic, ControlBarStateManager } from './control-bar';
```
