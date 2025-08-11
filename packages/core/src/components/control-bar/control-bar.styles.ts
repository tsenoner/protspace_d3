import { css } from "lit";

export const controlBarStyles = css`
  :host {
    display: block;
    font-family: system-ui, -apple-system, sans-serif;
    /* UniProt-inspired design tokens */
    --up-primary: #00a3e0; /* lighter azure */
    --up-primary-hover: #008ec4;
    --up-surface: #ffffff;
    --up-border: #d9e2ec;
    --up-muted: #4a5568;
  }

  .control-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 1rem;
    background: var(--up-surface);
    border-bottom: 1px solid var(--up-border);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
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
    color: var(--up-muted);
  }

  select {
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--up-border);
    border-radius: 0.25rem;
    background: var(--up-surface);
    font-size: 0.875rem;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  select:focus {
    outline: none;
    border-color: var(--up-primary);
    box-shadow: 0 0 0 2px rgba(0, 114, 181, 0.15);
  }

  button {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.75rem;
    border: 1px solid var(--up-border);
    border-radius: 0.25rem;
    background: var(--up-surface);
    color: var(--up-muted);
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  button:hover {
    background: #f6f8fb;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  button.active {
    background: var(--up-primary);
    color: #ffffff;
    border-color: var(--up-primary);
  }

  button.active:hover {
    background: var(--up-primary-hover);
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
    background: var(--up-surface);
    border: 1px solid var(--up-border);
    border-radius: 0.25rem;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08);
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
    background: #f6f8fb;
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


