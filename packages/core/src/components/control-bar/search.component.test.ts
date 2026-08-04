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

const FIVE = ['P00595', 'P00596', 'P00597', 'P00598', 'P00599'];

async function setupSearch(
  available: string[] = ['P00595', 'Q12345'],
  selected: string[] = ['P00595'],
): Promise<ProteinSearchElement> {
  const element = document.createElement('protspace-protein-search') as ProteinSearchElement;
  element.availableProteinIds = available;
  element.selectedProteinIds = selected;
  document.body.appendChild(element);
  await element.updateComplete;
  return element;
}

/** Type a query into the real input and flush the 120ms suggestion debounce. */
async function typeQuery(element: ProteinSearchElement, query: string): Promise<void> {
  const input = element.shadowRoot!.querySelector('#protein-search-input') as HTMLInputElement;
  input.focus();
  input.value = query;
  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  vi.advanceTimersByTime(120);
  await element.updateComplete;
}

const rowsOf = (element: ProteinSearchElement): HTMLElement[] =>
  Array.from(element.shadowRoot!.querySelectorAll('.search-suggestion'));

const rowText = (row: HTMLElement): string => row.textContent!.trim();

describe('protspace-protein-search feedback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  it('marks an exact already-selected protein instead of reporting no matches', async () => {
    const element = await setupSearch();
    await typeQuery(element, 'p00595');

    const rows = rowsOf(element);
    expect(rows).toHaveLength(1);
    expect(rowText(rows[0])).toBe('P00595');
    expect(rows[0].classList.contains('selected')).toBe(true);
    expect(element.shadowRoot!.querySelector('.no-results')).toBeNull();
  });

  it('lists every already-selected protein for a partial query', async () => {
    const element = await setupSearch([...FIVE, 'Q12345'], FIVE);
    await typeQuery(element, 'P0059');

    const rows = rowsOf(element);
    expect(rows.map(rowText)).toEqual(FIVE);
    expect(rows.every((row) => row.classList.contains('selected'))).toBe(true);
    expect(element.shadowRoot!.querySelector('.no-results')).toBeNull();
  });

  it('shows a selected ID that is a strict prefix of unselected IDs', async () => {
    const element = await setupSearch(['GT4', 'GT40', 'GT41'], ['GT4']);
    await typeQuery(element, 'GT4');

    const rows = rowsOf(element);
    expect(rows.map(rowText)).toEqual(['GT4', 'GT40', 'GT41']);
    expect(rows.map((row) => row.classList.contains('selected'))).toEqual([true, false, false]);
  });

  it('still reports no matches when nothing prefix-matches', async () => {
    const element = await setupSearch();
    await typeQuery(element, 'zzz');

    expect(rowsOf(element)).toHaveLength(0);
    expect(element.shadowRoot!.querySelector('.no-results')?.textContent).toBe(
      'No matching protein IDs found',
    );
  });

  it('surfaces current selections when the empty input is focused', async () => {
    const element = await setupSearch();
    const input = element.shadowRoot!.querySelector('#protein-search-input') as HTMLInputElement;
    input.focus();
    input.dispatchEvent(new Event('focus', { bubbles: true, composed: true }));
    await element.updateComplete;

    const rows = rowsOf(element);
    expect(rows.map(rowText)).toEqual(['P00595', 'Q12345']);
    expect(rows.map((row) => row.classList.contains('selected'))).toEqual([true, false]);
  });

  it('marks rows with aria-selected for assistive technology', async () => {
    const element = await setupSearch(['GT4', 'GT40'], ['GT4']);
    await typeQuery(element, 'GT4');

    const rows = rowsOf(element);
    expect(rows.map((row) => row.getAttribute('aria-selected'))).toEqual(['true', 'false']);
    expect(rows[0].getAttribute('title')).toBe('Remove from selection');
    expect(rows[0].getAttribute('aria-label')).toBe('GT4, remove from selection');
    expect(rows[1].getAttribute('aria-label')).toBe('GT40');
  });

  it('emits remove-selection when a marked row is clicked', async () => {
    const element = await setupSearch([...FIVE, 'Q12345'], FIVE);
    await typeQuery(element, 'P0059');

    const removed: string[] = [];
    element.addEventListener('remove-selection', (event) => {
      removed.push((event as CustomEvent<{ proteinId: string }>).detail.proteinId);
    });

    rowsOf(element)[0].dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(removed).toEqual(['P00595']);
  });

  it('removes the highlighted marked row on Enter', async () => {
    const element = await setupSearch([...FIVE, 'Q12345'], FIVE);
    await typeQuery(element, 'P0059');

    const removed: string[] = [];
    element.addEventListener('remove-selection', (event) => {
      removed.push((event as CustomEvent<{ proteinId: string }>).detail.proteinId);
    });

    const input = element.shadowRoot!.querySelector('#protein-search-input') as HTMLInputElement;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(removed).toEqual(['P00595']);
  });

  it('adds, not removes, when an unselected row is activated', async () => {
    const element = await setupSearch(['GT4', 'GT40'], ['GT4']);
    await typeQuery(element, 'GT4');

    const added: string[] = [];
    const removed: string[] = [];
    element.addEventListener('add-selection', (event) => {
      added.push((event as CustomEvent<{ proteinId: string }>).detail.proteinId);
    });
    element.addEventListener('remove-selection', (event) => {
      removed.push((event as CustomEvent<{ proteinId: string }>).detail.proteinId);
    });

    rowsOf(element)[1].dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(added).toEqual(['GT40']);
    expect(removed).toEqual([]);
  });

  it('keeps the query and flips the row to selectable after a removal', async () => {
    const element = await setupSearch([...FIVE, 'Q12345'], FIVE);
    await typeQuery(element, 'P0059');

    // Simulate the parent echoing the new selection back down.
    element.selectedProteinIds = FIVE.slice(1);
    await element.updateComplete;

    const rows = rowsOf(element);
    expect(rows.map(rowText)).toEqual(FIVE);
    expect(rows[0].classList.contains('selected')).toBe(false);
    expect(element.shadowRoot!.querySelector('.no-results')).toBeNull();
  });

  it('advances the highlight past the first row on repeated ArrowDown', async () => {
    const element = await setupSearch([...FIVE, 'Q12345'], []);
    await typeQuery(element, 'P0059');

    const input = element.shadowRoot!.querySelector('#protein-search-input') as HTMLInputElement;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await element.updateComplete;

    const rows = rowsOf(element);
    expect(rows[2].classList.contains('active')).toBe(true);
  });

  it('activates the arrow-highlighted row on Enter, not the first row', async () => {
    const element = await setupSearch([...FIVE, 'Q12345'], []);
    await typeQuery(element, 'P0059');

    const added: string[] = [];
    element.addEventListener('add-selection', (event) => {
      added.push((event as CustomEvent<{ proteinId: string }>).detail.proteinId);
    });

    const input = element.shadowRoot!.querySelector('#protein-search-input') as HTMLInputElement;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(added).toEqual(['P00597']);
  });

  it('still activates the first row when Enter interrupts a pending debounce', async () => {
    const element = await setupSearch([...FIVE, 'Q12345'], []);
    const input = element.shadowRoot!.querySelector('#protein-search-input') as HTMLInputElement;
    input.focus();
    input.value = 'P0059';
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    // Deliberately do NOT advance timers — the debounce is still pending.

    const added: string[] = [];
    element.addEventListener('add-selection', (event) => {
      added.push((event as CustomEvent<{ proteinId: string }>).detail.proteinId);
    });

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(added).toEqual(['P00595']);
  });

  it('clamps the highlight when a selection change shortens the list', async () => {
    const ids = Array.from({ length: 12 }, (_, i) => `A${String(i + 1).padStart(2, '0')}`);
    // 11 selected: 10 fit the selected budget, A12 remains selectable => 11 rows.
    const element = await setupSearch(ids, ids.slice(0, 11));
    await typeQuery(element, 'A');
    expect(rowsOf(element)).toHaveLength(11);

    const input = element.shadowRoot!.querySelector('#protein-search-input') as HTMLInputElement;
    for (let i = 0; i < 10; i++) {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    }
    await element.updateComplete;
    expect(rowsOf(element)[10].classList.contains('active')).toBe(true);

    // Selecting A12 too: 10 marked rows, nothing selectable => 10 rows.
    element.selectedProteinIds = ids;
    await element.updateComplete;

    const rows = rowsOf(element);
    expect(rows).toHaveLength(10);
    expect(rows[9].classList.contains('active')).toBe(true);
  });

  it('does not reopen the dropdown after an add echoes back a selection change', async () => {
    const element = await setupSearch(['GT4', 'GT40'], []);
    await typeQuery(element, 'GT40');
    expect(rowsOf(element)).toHaveLength(1);

    const input = element.shadowRoot!.querySelector('#protein-search-input') as HTMLInputElement;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await element.updateComplete;

    // The add cleared the query and closed the dropdown synchronously.
    expect(rowsOf(element)).toHaveLength(0);
    expect(element.shadowRoot!.querySelector('.search-suggestions')).toBeNull();

    // Simulate the parent echoing the new selection back down — this must NOT
    // reopen the dropdown even though the input is still focused with an empty query.
    element.selectedProteinIds = ['GT40'];
    await element.updateComplete;

    expect(rowsOf(element)).toHaveLength(0);
    expect(element.shadowRoot!.querySelector('.search-suggestions')).toBeNull();
  });
});
