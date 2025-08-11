import { css } from "lit";

export const dataLoaderStyles = css`
  :host {
    display: block;
    padding: 1rem;
    border: 2px dashed #ccc;
    border-radius: 8px;
    text-align: center;
    background: #fafafa;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  :host(:hover) {
    border-color: #666;
    background: #f0f0f0;
  }

  :host([loading]) {
    border-color: #007acc;
    background: #e6f3ff;
    cursor: wait;
  }

  :host([error]) {
    border-color: #d32f2f;
    background: #ffebee;
  }

  .drop-zone {
    padding: 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .icon {
    width: 48px;
    height: 48px;
    opacity: 0.5;
  }

  .message {
    font-size: 1.1rem;
    color: #666;
    max-width: 400px;
  }

  .file-info {
    font-size: 0.9rem;
    color: #888;
    margin-top: 0.5rem;
  }

  .progress {
    width: 100%;
    max-width: 300px;
    height: 4px;
    background: #e0e0e0;
    border-radius: 2px;
    overflow: hidden;
    margin-top: 1rem;
  }

  .progress-bar {
    height: 100%;
    background: #007acc;
    transition: width 0.3s ease;
  }

  .error-message {
    color: #d32f2f;
    font-size: 0.9rem;
    margin-top: 0.5rem;
  }

  .hidden-input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
`;


