/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './search';

type ProteinSearchElement = HTMLElement & {
  availableProteinIds: string[];
  selectedProteinIds: string[];
  updateComplete: Promise<unknown>;
};

async function setupSearch(): Promise<ProteinSearchElement> {
  const element = document.createElement('protspace-protein-search') as ProteinSearchElement;
  element.availableProteinIds = ['P00595', 'Q12345'];
  element.selectedProteinIds = ['P00595'];
  document.body.appendChild(element);
  await element.updateComplete;
  return element;
}

describe('protspace-protein-search feedback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  it('reports when an exact protein ID is already selected', async () => {
    const element = await setupSearch();
    const input = element.shadowRoot!.querySelector('#protein-search-input') as HTMLInputElement;

    input.focus();
    input.value = 'p00595';
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    vi.advanceTimersByTime(120);
    await element.updateComplete;

    expect(element.shadowRoot!.querySelector('.no-results')?.textContent).toBe(
      'Protein ID is already selected',
    );
  });
});
