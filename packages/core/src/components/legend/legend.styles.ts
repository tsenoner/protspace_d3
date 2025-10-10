import { css } from 'lit';

export const legendStyles = css`
  :host {
    --legend-bg: #ffffff;
    --legend-bg-dark: #1f2937;
    --legend-border: #d9e2ec; /* softer border for UniProt */
    --legend-border-dark: #374151;
    --legend-border-radius: 6px;
    --legend-padding: 0.75rem;
    --legend-item-padding: 0.625rem;
    --legend-item-gap: 0.5rem;
    --legend-text-color: #334155;
    --legend-text-color-dark: #f9fafb;
    --legend-text-secondary: #5b6b7a;
    --legend-text-secondary-dark: #9ca3af;
    --legend-hover-bg: #f6f8fb;
    --legend-hover-bg-dark: #374151;
    --legend-hidden-bg: #f6f8fb;
    --legend-hidden-bg-dark: #374151;
    --legend-hidden-opacity: 0.5;
    --legend-active-bg: #e6f1f8;
    --legend-active-bg-dark: #1e3a8a;
    --legend-drag-bg: #eaf4fb;
    --legend-drag-bg-dark: #1e3a8a;
    --legend-selected-ring: #00a3e0; /* UniProt lighter azure */
    --legend-extracted-border: #10b981;

    display: block;
    background: var(--legend-bg);
    border: 1px solid var(--legend-border);
    border-radius: var(--legend-border-radius);
    padding: var(--legend-padding) !important;
    max-width: 320px;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.06);
    user-select: none;
  }

  @media (prefers-color-scheme: dark) {
    :host {
      background: var(--legend-bg-dark);
      border-color: var(--legend-border-dark);
    }
  }

  .legend-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .legend-title {
    font-weight: 500;
    font-size: 1rem;
    color: var(--legend-text-color);
  }

  @media (prefers-color-scheme: dark) {
    .legend-title {
      color: var(--legend-text-color-dark);
    }
  }

  .customize-button {
    background: none;
    border: none;
    color: var(--legend-text-secondary);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.25rem;
    transition: color 0.2s ease;
  }

  .customize-button:hover {
    color: var(--legend-text-color);
  }

  @media (prefers-color-scheme: dark) {
    .customize-button {
      color: var(--legend-text-secondary-dark);
    }
    .customize-button:hover {
      color: var(--legend-text-color-dark);
    }
  }

  .legend-items {
    display: flex;
    flex-direction: column;
    gap: var(--legend-item-gap);
  }

  .legend-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--legend-item-padding);
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s ease;
    background: var(--legend-hover-bg);
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    position: relative;
  }

  .legend-item:hover {
    background: var(--legend-hover-bg);
    box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.1);
  }

  .legend-item:active {
    background: var(--legend-active-bg);
  }

  .legend-item.hidden {
    opacity: var(--legend-hidden-opacity);
    background: var(--legend-hidden-bg);
  }

  .legend-item.dragging {
    background: var(--legend-drag-bg);
    transform: scale(1.02);
    box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.15);
    border: 2px solid #7c3aed !important;
    border-radius: 0.5rem;
  }

  .legend-item.selected {
    box-shadow: 0 0 0 2px var(--legend-selected-ring);
  }

  /* Drag-and-drop visual hints */
  .legend-item.dragging {
    opacity: 0.8;
    z-index: 1000;
    position: relative;
  }

  .legend-item.extracted {
    border-left: 4px solid var(--legend-extracted-border);
  }

  @media (prefers-color-scheme: dark) {
    .legend-item {
      background: var(--legend-hover-bg-dark);
    }
    .legend-item:hover {
      background: var(--legend-hover-bg-dark);
    }
    .legend-item:active {
      background: var(--legend-active-bg-dark);
    }
    .legend-item.hidden {
      background: var(--legend-hidden-bg-dark);
    }
    .legend-item.dragging {
      background: var(--legend-drag-bg-dark);
    }
  }

  .legend-item-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .drag-handle {
    display: flex;
    align-items: center;
    padding: 0.25rem;
    border-radius: 0.25rem;
    cursor: grab;
    color: var(--legend-text-secondary);
  }

  .drag-handle:active {
    cursor: grabbing;
  }

  @media (prefers-color-scheme: dark) {
    .drag-handle {
      color: var(--legend-text-secondary-dark);
    }
  }

  .legend-symbol {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .legend-text {
    font-size: 0.875rem;
    color: var(--legend-text-color);
  }

  @media (prefers-color-scheme: dark) {
    .legend-text {
      color: var(--legend-text-color-dark);
    }
  }

  .view-button {
    background: none;
    border: none;
    color: #00a3e0;
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 500;
    margin-left: 0.25rem;
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    transition: color 0.2s ease;
  }

  .view-button:hover {
    color: #008ec4;
  }

  .legend-count {
    font-size: 0.875rem;
    color: var(--legend-text-secondary);
    font-weight: 500;
  }

  @media (prefers-color-scheme: dark) {
    .legend-count {
      color: var(--legend-text-secondary-dark);
    }
  }

  .legend-empty {
    text-align: center;
    color: var(--legend-text-secondary);
    font-style: italic;
    padding: 1rem 0;
  }

  @media (prefers-color-scheme: dark) {
    .legend-empty {
      color: var(--legend-text-secondary-dark);
    }
  }

  /* Modal styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background: var(--legend-bg);
    padding: 1.5rem;
    border-radius: 0.5rem;
    box-shadow:
      0 20px 25px -5px rgba(0, 0, 0, 0.1),
      0 10px 10px -5px rgba(0, 0, 0, 0.04);
    max-width: 24rem;
    width: 100%;
    max-height: 80vh;
    overflow: auto;
  }

  @media (prefers-color-scheme: dark) {
    .modal-content {
      background: var(--legend-bg-dark);
    }
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .modal-title {
    font-size: 1.125rem;
    font-weight: 500;
    color: var(--legend-text-color);
  }

  @media (prefers-color-scheme: dark) {
    .modal-title {
      color: var(--legend-text-color-dark);
    }
  }

  .close-button {
    background: none;
    border: none;
    color: var(--legend-text-secondary);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.25rem;
    transition: color 0.2s ease;
  }

  .close-button:hover {
    color: var(--legend-text-color);
  }

  @media (prefers-color-scheme: dark) {
    .close-button {
      color: var(--legend-text-secondary-dark);
    }
    .close-button:hover {
      color: var(--legend-text-color-dark);
    }
  }

  .modal-description {
    font-size: 0.875rem;
    color: var(--legend-text-secondary);
    margin-bottom: 1rem;
  }

  @media (prefers-color-scheme: dark) {
    .modal-description {
      color: var(--legend-text-secondary-dark);
    }
  }

  .other-items-list {
    border: 1px solid var(--legend-border);
    border-radius: 0.375rem;
    margin-bottom: 1rem;
    max-height: 15rem;
    overflow-y: auto;
  }

  @media (prefers-color-scheme: dark) {
    .other-items-list {
      border-color: var(--legend-border-dark);
    }
  }

  .other-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    border-bottom: 1px solid var(--legend-border);
    transition: background-color 0.2s ease;
  }

  .other-item:last-child {
    border-bottom: none;
  }

  .other-item:hover {
    background: var(--legend-hover-bg);
  }

  @media (prefers-color-scheme: dark) {
    .other-item {
      border-color: var(--legend-border-dark);
    }
    .other-item:hover {
      background: var(--legend-hover-bg-dark);
    }
  }

  .other-item-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .other-item-name {
    color: var(--legend-text-color);
  }

  .other-item-count {
    font-size: 0.75rem;
    color: var(--legend-text-secondary);
  }

  @media (prefers-color-scheme: dark) {
    .other-item-name {
      color: var(--legend-text-color-dark);
    }
    .other-item-count {
      color: var(--legend-text-secondary-dark);
    }
  }

  .extract-button {
    background: none;
    border: none;
    color: #00a3e0;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    transition: color 0.2s ease;
  }

  .extract-button:hover {
    color: #008ec4;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
  }

  .modal-close-button {
    background: var(--legend-hover-bg);
    border: none;
    color: var(--legend-text-color);
    cursor: pointer;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-weight: 500;
    transition: background-color 0.2s ease;
  }

  .modal-close-button:hover {
    background: var(--legend-hidden-bg);
  }

  @media (prefers-color-scheme: dark) {
    .modal-close-button {
      background: var(--legend-hover-bg-dark);
      color: var(--legend-text-color-dark);
    }
    .modal-close-button:hover {
      background: var(--legend-hidden-bg-dark);
    }
  }
`;
