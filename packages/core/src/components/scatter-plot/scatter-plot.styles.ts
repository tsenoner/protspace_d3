import { css } from 'lit';

export const scatterplotStyles = css`
  :host {
    /* Layout */
    --protspace-width: 100%;
    --protspace-height: 600px;
    --protspace-bg-color: #ffffff;
    --protspace-border-color: #d9e2ec; /* UniProt-like subtle border */
    --protspace-border-radius: 6px;

    /* Points */
    --protspace-point-size: 80px;
    --protspace-point-size-highlighted: 120px;
    --protspace-point-size-selected: 150px;
    --protspace-point-opacity-base: 0.8;
    --protspace-point-opacity-selected: 1;
    --protspace-point-opacity-faded: 0.2;

    /* Selection */
    --protspace-selection-color: #ff8a3d; /* warmer but softer */
    --protspace-highlight-color: #00a3e0; /* UniProt azure */
    --protspace-default-stroke: #3a3a3a;
    --protspace-stroke-width-base: 1px;
    --protspace-stroke-width-highlighted: 2px;
    --protspace-stroke-width-selected: 3px;

    /* Transitions */
    --protspace-transition-duration: 0.2s;
    --protspace-transition-easing: ease-in-out;

    /* Tooltip */
    --protspace-tooltip-bg: rgba(255, 255, 255, 0.95);
    --protspace-tooltip-border: #d9e2ec;
    --protspace-tooltip-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);

    /* Brush */
    --protspace-brush-stroke: #0072b5;
    --protspace-brush-fill: rgba(0, 114, 181, 0.15);

    display: block;
    width: var(--protspace-width);
    height: var(--protspace-height);
    position: relative;
    background: var(--protspace-bg-color);
    border: 1px solid var(--protspace-border-color);
    border-radius: var(--protspace-border-radius);
    overflow: hidden;
    margin: 0;
    padding: 0;
  }

  .container {
    width: 100%;
    height: 100%;
    position: relative;
    margin: 0;
    padding: 0;
  }

  svg,
  canvas {
    position: absolute;
    top: 0;
    left: 0;
  }

  svg {
    z-index: 10;
    pointer-events: all;
  }

  canvas {
    z-index: 5;
    pointer-events: none;
  }

  .loading-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.8);
    z-index: 10;
  }

  .loading-spinner {
    width: 3rem;
    height: 3rem;
    border: 2px solid #e5e7eb;
    border-top: 2px solid #00a3e0;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  .mode-indicator {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    z-index: 10;
    padding: 0.5rem;
    background: #00a3e0;
    color: white;
    font-size: 0.75rem;
    border-radius: 0.375rem;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .tooltip {
    position: absolute;
    z-index: 20;
    padding: 0.5rem;
    background: var(--protspace-tooltip-bg);
    border: 1px solid var(--protspace-tooltip-border);
    border-radius: 0.375rem;
    box-shadow: var(--protspace-tooltip-shadow);
    font-size: 0.875rem;
    max-width: 200px;
    word-wrap: break-word;
    pointer-events: none;
  }

  .tooltip-protein-id {
    font-weight: bold;
    margin-bottom: 0.25rem;
  }

  .tooltip-feature {
    font-size: 0.75rem;
    color: #5b6b7a;
  }

  .tooltip-hint {
    font-size: 0.75rem;
    color: #94a3b8;
    margin-top: 0.25rem;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
`;
