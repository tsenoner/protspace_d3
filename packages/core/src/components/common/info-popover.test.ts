/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import './info-popover';

type PopoverEl = HTMLElement & {
  description: string;
  docsUrl: string;
  label: string;
  align: 'left' | 'right';
  placement: 'bottom' | 'side';
  updateComplete: Promise<unknown>;
};

async function setup(props: Partial<PopoverEl> = {}): Promise<PopoverEl> {
  const el = document.createElement('protspace-info-popover') as PopoverEl;
  el.description = props.description ?? 'A brief summary.';
  if (props.docsUrl !== undefined) el.docsUrl = props.docsUrl;
  el.label = props.label ?? 'Test annotation';
  if (props.align) el.align = props.align;
  if (props.placement) el.placement = props.placement;
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

const button = (el: PopoverEl) =>
  el.shadowRoot!.querySelector('.info-button') as HTMLButtonElement | null;
const popover = (el: PopoverEl) => el.shadowRoot!.querySelector('.popover');

describe('protspace-info-popover', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders nothing without a description or docs URL', async () => {
    const el = await setup({ description: '', docsUrl: '' });
    expect(button(el)).toBeNull();
    expect(popover(el)).toBeNull();
  });

  it('opens on hover and closes after the pointer leaves (with grace)', async () => {
    vi.useFakeTimers();
    const el = await setup();
    expect(popover(el)).toBeNull();

    el.dispatchEvent(new Event('pointerenter'));
    await el.updateComplete;
    expect(popover(el)).not.toBeNull();

    el.dispatchEvent(new Event('pointerleave'));
    await el.updateComplete;
    // still open during the grace window
    expect(popover(el)).not.toBeNull();

    vi.advanceTimersByTime(200);
    await el.updateComplete;
    expect(popover(el)).toBeNull();
  });

  it('stays open when the pointer crosses from the icon into the popover', async () => {
    vi.useFakeTimers();
    const el = await setup();
    el.dispatchEvent(new Event('pointerenter'));
    await el.updateComplete;

    // leaving the icon starts the close timer, but re-entering (now over the popover) cancels it
    el.dispatchEvent(new Event('pointerleave'));
    el.dispatchEvent(new Event('pointerenter'));
    vi.advanceTimersByTime(200);
    await el.updateComplete;

    expect(popover(el)).not.toBeNull();
  });

  it('opens on keyboard focus and closes when focus leaves the component', async () => {
    const el = await setup();
    button(el)!.dispatchEvent(new FocusEvent('focus'));
    await el.updateComplete;
    expect(popover(el)).not.toBeNull();

    el.dispatchEvent(new FocusEvent('focusout', { relatedTarget: document.body, bubbles: true }));
    await el.updateComplete;
    expect(popover(el)).toBeNull();
  });

  it('click pins it open so it survives the pointer leaving, and toggles closed', async () => {
    vi.useFakeTimers();
    const el = await setup();

    el.dispatchEvent(new Event('pointerenter'));
    button(el)!.click(); // pin
    el.dispatchEvent(new Event('pointerleave'));
    vi.advanceTimersByTime(200);
    await el.updateComplete;
    expect(popover(el)).not.toBeNull();

    button(el)!.click(); // unpin
    await el.updateComplete;
    expect(popover(el)).toBeNull();
  });

  it('closes on Escape', async () => {
    const el = await setup();
    button(el)!.dispatchEvent(new FocusEvent('focus'));
    await el.updateComplete;
    expect(popover(el)).not.toBeNull();

    popover(el)!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await el.updateComplete;
    expect(popover(el)).toBeNull();
  });

  it('side placement floats the popover beside the icon with an arrow', async () => {
    const el = await setup({ placement: 'side' });
    el.dispatchEvent(new Event('pointerenter'));
    await el.updateComplete;
    const pop = popover(el);
    expect(pop).not.toBeNull();
    expect(pop?.classList.contains('placement-side')).toBe(true);
    expect(el.shadowRoot!.querySelector('.popover-arrow')).not.toBeNull();
  });

  it('side placement stays open until the pointer leaves the whole row', async () => {
    vi.useFakeTimers();
    const row = document.createElement('div');
    document.body.appendChild(row);
    const el = document.createElement('protspace-info-popover') as PopoverEl;
    el.description = 'Brief summary.';
    el.placement = 'side';
    row.appendChild(el);
    await el.updateComplete; // firstUpdated attaches the row keep-open listener

    el.dispatchEvent(new Event('pointerenter')); // open via the icon
    await el.updateComplete;
    expect(popover(el)).not.toBeNull();

    // Leaving just the icon must NOT close it — the keep-open region is the whole row.
    el.dispatchEvent(new Event('pointerleave'));
    vi.advanceTimersByTime(300);
    await el.updateComplete;
    expect(popover(el)).not.toBeNull();

    // Leaving the row closes it after the grace period.
    row.dispatchEvent(new Event('pointerleave'));
    vi.advanceTimersByTime(300);
    await el.updateComplete;
    expect(popover(el)).toBeNull();
  });

  it('bottom placement (default) has no arrow', async () => {
    const el = await setup();
    el.dispatchEvent(new Event('pointerenter'));
    await el.updateComplete;
    expect(popover(el)?.classList.contains('placement-side')).toBe(false);
    expect(el.shadowRoot!.querySelector('.popover-arrow')).toBeNull();
  });

  it('relates the expanded trigger to a named, described popover', async () => {
    const el = await setup({ label: 'No annotation' });
    button(el)!.click();
    await el.updateComplete;
    const trigger = button(el)!;
    const dialog = popover(el)!;

    expect(trigger.getAttribute('aria-controls')).toBe(dialog.id);
    // Describing the dialog itself would announce its aria-label instead of its contents,
    // so the description target is the unlabelled content wrapper.
    expect(trigger.getAttribute('aria-describedby')).toBe(`${dialog.id}-content`);
    expect(dialog.querySelector('.popover-content')!.id).toBe(`${dialog.id}-content`);
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-label')).toBe('No annotation information');
  });

  it('describes a popover that carries only projected content', async () => {
    // A stats popover has no description paragraph at all, so describing from one would
    // announce nothing — the whole popover has to be the description target.
    const el = await setup({ description: '', docsUrl: '' });
    el.appendChild(
      Object.assign(document.createElement('div'), { textContent: 'Silhouette 0.42' }),
    );
    el.requestUpdate();
    await el.updateComplete;

    button(el)!.click();
    await el.updateComplete;

    expect(button(el)!.getAttribute('aria-describedby')).toBe(`${popover(el)!.id}-content`);
    // The content reaches the popover through the slot, so it is part of the flattened tree the
    // accessible description is computed from (it is not in the shadow root's own textContent).
    const slot = popover(el)!.querySelector('slot') as HTMLSlotElement;
    expect(slot.assignedNodes().map((node) => node.textContent)).toEqual(['Silhouette 0.42']);
  });

  it('keeps a description-only popover describing its description text', async () => {
    // Regression guard: pointing aria-describedby at the dialog made screen readers announce the
    // dialog's aria-label instead of this sentence (every legend/annotation ⓘ on main).
    const el = await setup({ description: 'Predictions below this reliability are hidden.' });
    button(el)!.click();
    await el.updateComplete;

    const describedBy = button(el)!.getAttribute('aria-describedby')!;
    const described = popover(el)!.querySelector(`#${describedBy}`) as HTMLElement;
    expect(described.textContent).toContain('Predictions below this reliability are hidden.');
    expect(described.getAttribute('aria-label')).toBeNull();
  });

  it('clamps a right-aligned bottom popover to the left viewport margin', async () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(390);
    const el = await setup({ align: 'right' });
    el.dispatchEvent(new Event('pointerenter'));
    await el.updateComplete;
    const initialPopover = popover(el) as HTMLElement;
    vi.spyOn(initialPopover, 'getBoundingClientRect').mockReturnValue({
      left: -98,
      right: 162,
      top: 30,
      bottom: 100,
      width: 260,
      height: 70,
      x: -98,
      y: 30,
      toJSON: () => ({}),
    });

    el.requestUpdate();
    await el.updateComplete;
    await el.updateComplete;

    expect((popover(el) as HTMLElement).style.transform).toBe('translateX(106px)');
  });

  it('renders the docs link with the provided URL', async () => {
    const el = await setup({ docsUrl: '/docs/guide/annotations#ec' });
    el.dispatchEvent(new Event('pointerenter'));
    await el.updateComplete;
    const link = el.shadowRoot!.querySelector('.popover-link') as HTMLAnchorElement;
    expect(link).not.toBeNull();
    expect(link.getAttribute('href')).toBe('/docs/guide/annotations#ec');
    expect(link.getAttribute('target')).toBe('_blank');
  });
});
