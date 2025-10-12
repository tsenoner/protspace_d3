import { css } from 'lit';

export const dataLoaderStyles = css`
  :host {
    display: none;
  }

  :host(:hover) {
    border-color: #9bb4cc;
    background: #eef3f8;
  }

  :host([loading]) {
    border-color: #0072b5;
    background: #e6f2fa;
    cursor: wait;
  }

  :host([error]) {
    border-color: #c53030;
    background: #fff5f5;
  }

  .drop-zone {
    padding: 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    width: 100%;
    box-sizing: border-box;
  }

  .icon {
    width: 48px;
    height: 48px;
    opacity: 0.5;
  }

  .message {
    font-size: 1.1rem;
    color: #4a5568;
    max-width: 100%;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .file-info {
    font-size: 0.9rem;
    color: #718096;
    margin-top: 0.5rem;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .progress {
    width: 100%;
    max-width: 300px;
    height: 4px;
    background: #e5edf5;
    border-radius: 2px;
    overflow: hidden;
    margin-top: 1rem;
  }

  .progress-bar {
    height: 100%;
    background: #0072b5;
    transition: width 0.3s ease;
  }

  .error-message {
    color: #c53030;
    font-size: 0.9rem;
    margin-top: 0.5rem;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .hidden-input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  /* Responsive tweaks for small screens */
  @media (max-width: 640px) {
    :host {
      padding: 0.75rem;
    }

    .drop-zone {
      padding: 1.25rem;
      gap: 0.75rem;
    }

    .icon {
      width: 40px;
      height: 40px;
    }

    .message {
      font-size: 1rem;
    }
  }
`;
