import { css } from "lit";

export const controlBarStyles = css`
  :host {
    display: block;
    font-family: system-ui, -apple-system, sans-serif;
  }

  .control-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 1rem;
    background: white;
    border-bottom: 1px solid #e5e7eb;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .left-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .right-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .control-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }

  select {
    padding: 0.25rem 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    background: white;
    font-size: 0.875rem;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  select:focus {
    outline: none;
    ring: 2px;
    ring-color: #3b82f6;
    border-color: #3b82f6;
  }

  button {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    background: white;
    color: #374151;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  button:hover {
    background: #f9fafb;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  button.active {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }

  button.active:hover {
    background: #2563eb;
  }

  .icon {
    width: 1rem;
    height: 1rem;
    stroke: currentColor;
    fill: none;
    stroke-width: 1.5;
  }

  .export-container {
    position: relative;
  }

  .export-menu {
    position: absolute;
    right: 0;
    top: 100%;
    margin-top: 0.25rem;
    width: 10rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
    z-index: 50;
  }

  .export-menu ul {
    list-style: none;
    margin: 0;
    padding: 0.25rem 0;
  }

  .export-menu button {
    width: 100%;
    text-align: left;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0;
    background: none;
    font-size: 0.875rem;
  }

  .export-menu button:hover {
    background: #f9fafb;
  }

  .chevron-down {
    width: 1rem;
    height: 1rem;
    margin-left: 0.25rem;
  }

  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .control-bar {
      background: #1f2937;
      border-color: #374151;
    }

    label {
      color: #d1d5db;
    }

    select {
      background: #374151;
      border-color: #4b5563;
      color: #f9fafb;
    }

    button {
      background: #374151;
      border-color: #4b5563;
      color: #d1d5db;
    }

    button:hover {
      background: #4b5563;
    }

    .export-menu {
      background: #374151;
      border-color: #4b5563;
    }

    .export-menu button:hover {
      background: #4b5563;
    }
  }
`;


