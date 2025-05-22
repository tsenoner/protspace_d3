import { css } from 'lit';

export const lightTheme = css`
  :host {
    --protspace-bg-color: #ffffff;
    --protspace-border-color: #e1e5e9;
    --protspace-text-primary: #2d3748;
    --protspace-text-secondary: #718096;
    --protspace-selection-color: #FF5500;
    --protspace-highlight-color: #3B82F6;
    --protspace-default-stroke: #333333;
    --protspace-tooltip-bg: rgba(255, 255, 255, 0.95);
    --protspace-tooltip-border: #e1e5e9;
  }
`;

export const darkTheme = css`
  :host {
    --protspace-bg-color: #1a202c;
    --protspace-border-color: #4a5568;
    --protspace-text-primary: #f7fafc;
    --protspace-text-secondary: #a0aec0;
    --protspace-selection-color: #FF6B35;
    --protspace-highlight-color: #63B3ED;
    --protspace-default-stroke: #e2e8f0;
    --protspace-tooltip-bg: rgba(26, 32, 44, 0.95);
    --protspace-tooltip-border: #4a5568;
  }
`;

export const scientificTheme = css`
  :host {
    --protspace-bg-color: #fefefe;
    --protspace-border-color: #cccccc;
    --protspace-text-primary: #1a1a1a;
    --protspace-text-secondary: #666666;
    --protspace-selection-color: #d73027;
    --protspace-highlight-color: #fc8d59;
    --protspace-default-stroke: #333333;
    --protspace-point-size: 60px;
    --protspace-stroke-width-base: 0.5px;
  }
`;