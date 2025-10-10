import { css } from 'lit';

export const structureViewerStyles = css`
  :host {
    --protspace-viewer-width: 100%;
    --protspace-viewer-height: 400px;
    --protspace-viewer-bg: #ffffff;
    --protspace-viewer-border: #d9e2ec;
    --protspace-viewer-border-radius: 6px;
    --protspace-viewer-header-bg: #f6f8fb;
    --protspace-viewer-text: #334155;
    --protspace-viewer-text-muted: #5b6b7a;
    --protspace-viewer-error: #c53030;
    --protspace-viewer-loading: #00a3e0;

    display: block;
    width: var(--protspace-viewer-width);
    background: var(--protspace-viewer-bg);
    border: 1px solid var(--protspace-viewer-border);
    border-radius: var(--protspace-viewer-border-radius);
    overflow: hidden;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: var(--protspace-viewer-header-bg);
    border-bottom: 1px solid var(--protspace-viewer-border);
  }

  .title {
    font-size: 1rem;
    font-weight: 500;
    color: var(--protspace-viewer-text);
    margin: 0;
  }

  .protein-id {
    font-size: 0.875rem;
    color: var(--protspace-viewer-text-muted);
    margin-left: 0.5rem;
  }

  .close-button {
    background: none;
    border: none;
    font-size: 1.25rem;
    color: var(--protspace-viewer-text-muted);
    cursor: pointer;
    padding: 0.25rem;
    line-height: 1;
    border-radius: 0.25rem;
    transition: color 0.2s;
  }

  .close-button:hover {
    color: var(--protspace-viewer-text);
    background: rgba(0, 0, 0, 0.04);
  }

  .viewer-container {
    position: relative;
    width: 100%;
    height: var(--protspace-viewer-height);
    background: var(--protspace-viewer-bg);
  }

  .loading-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.9);
    z-index: 10;
  }

  .loading-spinner {
    width: 2.5rem;
    height: 2.5rem;
    border: 2px solid #e5e7eb;
    border-top: 2px solid var(--protspace-viewer-loading);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  .loading-text {
    color: var(--protspace-viewer-text-muted);
    font-size: 0.875rem;
  }

  .error-container {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: var(--protspace-viewer-bg);
    z-index: 10;
    padding: 2rem;
    text-align: center;
  }

  .error-title {
    color: var(--protspace-viewer-error);
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .empty-container {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: var(--protspace-viewer-bg);
    z-index: 5;
    padding: 2rem;
    text-align: center;
  }

  .empty-title {
    color: var(--protspace-viewer-text);
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .empty-message {
    color: var(--protspace-viewer-text-muted);
    font-size: 0.875rem;
  }

  .viewer-content {
    width: 100%;
    height: 100%;
  }

  .tips {
    padding: 0.5rem 1rem;
    background: #f6f8fb;
    border-top: 1px solid var(--protspace-viewer-border);
    font-size: 0.75rem;
    color: var(--protspace-viewer-text-muted);
  }

  .tips strong {
    font-weight: 600;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    :host {
      --protspace-viewer-bg: #1f2937;
      --protspace-viewer-border: #374151;
      --protspace-viewer-header-bg: #111827;
      --protspace-viewer-text: #f9fafb;
      --protspace-viewer-text-muted: #9ca3af;
    }
  }
`;
