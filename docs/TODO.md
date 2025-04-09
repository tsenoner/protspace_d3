# ProtSpace D3 Todo List

## Legend Settings Modal
- Implement modal dialog for legend settings
  - [x] Add cog icon button to trigger modal
  - [ ] Create modal component with color and shape settings
  - [ ] Add color picker for feature values (no transparency)
  - [ ] Implement shape selector dropdown with standard shapes
  - [ ] Add save/cancel buttons with unsaved changes confirmation

## Protein Selection and Structure Display
- [ ] Remove right-click functionality on dots
- Implement protein selection handling
  - [x] Handle selection from search bar
  - [x] Handle selection from dot selection in vizualisation
  - [ ] Highlight last selected protein with border and increase z-index
- AlphaFold2 Structure Integration
  - [ ] Create structure display component below legend
  - [ ] Implement structure retrieval from AlphaFold2
  - [ ] Add loading indicator during retrieval
  - [ ] Handle error states for failed retrievals
  - [ ] Implement structure replacement logic
  - [ ] Add error message display for failed retrievals

## UI Enhancements
- [ ] Add GitHub icon with repository link
- [ ] Make canvas responsive to window size
  - [ ] Add resize event listener
  - [ ] Dynamically update canvas dimensions
  - [ ] Maintain visualization aspect ratio

## Data Integration
- [ ] Create POST endpoint for data import
- [ ] Implement request validation with Zod
- [ ] Add JSON parsing with schema validation
- [ ] Update visualization with new data
- [ ] Handle and display validation errors

## Legend Interaction
- [ ] Implement single-click visibility toggle
- [ ] Add double-click behaviors:
  - [ ] Show only clicked label when others visible
  - [ ] Show all labels when only one is visible
  - [ ] Show all labels when clicking inactive label
- [ ] Fix legend counts to show actual protein numbers
- [ ] Update counts dynamically during isolation mode