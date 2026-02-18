import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ATTR, ROLES } from './config';

/** Build a minimal FAQ item HTML string. */
const faqItem = (title: string, content: string) => `
  <div ${ATTR.element}="${ROLES.item}">
    <div ${ATTR.element}="${ROLES.trigger}">
      <span ${ATTR.element}="${ROLES.title}">${title}</span>
      <span ${ATTR.element}="${ROLES.iconOpen}">+</span>
      <span ${ATTR.element}="${ROLES.iconClose}">-</span>
    </div>
    <div ${ATTR.element}="${ROLES.content}">
      <p>${content}</p>
    </div>
  </div>
`;

/** Build a group wrapping multiple items. */
const faqGroup = (items: string, attrs = '') =>
  `<div ${ATTR.element}="${ROLES.group}" ${attrs}>${items}</div>`;

/** Reset global state between tests. */
const resetGlobals = () => {
  window.__curFaqInitialized = false;
  delete window.__curFaq;
  document.body.innerHTML = '';
  document.head.querySelectorAll('style').forEach((s) => s.remove());
};

describe('FAQ module integration', () => {
  beforeEach(() => {
    vi.resetModules();
    resetGlobals();
  });

  afterEach(() => {
    window.__curFaq?.destroy();
    resetGlobals();
  });

  const initModule = async () => {
    // vi.resetModules() busts the cache so the module re-executes onDomReady(initFaq)
    await import('./index');
  };

  describe('initialisation', () => {
    it('initialises and exposes window.__curFaq', async () => {
      document.body.innerHTML = faqGroup(faqItem('Q1', 'A1'));
      await initModule();
      expect(window.__curFaq).toBeDefined();
      expect(window.__curFaqInitialized).toBe(true);
    });

    it('parses all items from the DOM', async () => {
      document.body.innerHTML = faqGroup(faqItem('Q1', 'A1') + faqItem('Q2', 'A2'));
      await initModule();
      expect(window.__curFaq!.items).toHaveLength(2);
    });

    it('starts all items in closed state', async () => {
      document.body.innerHTML = faqGroup(faqItem('Q1', 'A1') + faqItem('Q2', 'A2'));
      await initModule();
      const items = document.querySelectorAll(`[${ATTR.element}="${ROLES.item}"]`);
      items.forEach((item) => {
        expect(item.getAttribute('data-faq-open')).toBe('false');
      });
    });

    it('sets hidden attribute on content elements', async () => {
      document.body.innerHTML = faqGroup(faqItem('Q1', 'A1'));
      await initModule();
      const content = document.querySelector(`[${ATTR.element}="${ROLES.content}"]`);
      expect(content?.hasAttribute('hidden')).toBe(true);
    });

    it('sets up ARIA attributes on triggers', async () => {
      document.body.innerHTML = faqGroup(faqItem('Q1', 'A1'));
      await initModule();
      const trigger = document.querySelector(`[${ATTR.element}="${ROLES.trigger}"]`);
      expect(trigger?.getAttribute('aria-expanded')).toBe('false');
      expect(trigger?.getAttribute('aria-controls')).toBeTruthy();
      expect(trigger?.getAttribute('role')).toBe('button');
      expect(trigger?.getAttribute('tabindex')).toBe('0');
    });

    it('injects a style element', async () => {
      document.body.innerHTML = faqGroup(faqItem('Q1', 'A1'));
      await initModule();
      expect(document.getElementById('cur-faq-styles')).not.toBeNull();
    });
  });

  describe('default open', () => {
    it('opens the item at the specified index', async () => {
      document.body.innerHTML = faqGroup(
        faqItem('Q1', 'A1') + faqItem('Q2', 'A2') + faqItem('Q3', 'A3'),
        `${ATTR.defaultOpen}="1"`
      );
      await initModule();
      const items = document.querySelectorAll(`[${ATTR.element}="${ROLES.item}"]`);
      expect(items[0].getAttribute('data-faq-open')).toBe('false');
      expect(items[1].getAttribute('data-faq-open')).toBe('true');
      expect(items[2].getAttribute('data-faq-open')).toBe('false');
    });

    it('ignores out-of-range index gracefully', async () => {
      document.body.innerHTML = faqGroup(faqItem('Q1', 'A1'), `${ATTR.defaultOpen}="99"`);
      await initModule();
      const item = document.querySelector(`[${ATTR.element}="${ROLES.item}"]`);
      expect(item?.getAttribute('data-faq-open')).toBe('false');
    });
  });

  describe('per-group configuration', () => {
    it('resolves different settings for different groups', async () => {
      document.body.innerHTML =
        faqGroup(faqItem('G1-Q1', 'G1-A1'), `${ATTR.accordion}="true" ${ATTR.defaultOpen}="0"`) +
        faqGroup(faqItem('G2-Q1', 'G2-A1') + faqItem('G2-Q2', 'G2-A2'));
      await initModule();

      const groups = document.querySelectorAll(`[${ATTR.element}="${ROLES.group}"]`);

      // First group: item should be open (default-open=0)
      const g1Items = groups[0].querySelectorAll(`[${ATTR.element}="${ROLES.item}"]`);
      expect(g1Items[0].getAttribute('data-faq-open')).toBe('true');

      // Second group: both items should be closed
      const g2Items = groups[1].querySelectorAll(`[${ATTR.element}="${ROLES.item}"]`);
      expect(g2Items[0].getAttribute('data-faq-open')).toBe('false');
      expect(g2Items[1].getAttribute('data-faq-open')).toBe('false');
    });
  });

  describe('orphan items (no group)', () => {
    it('picks up items not inside any group', async () => {
      document.body.innerHTML =
        faqItem('Orphan Q1', 'Orphan A1') + faqItem('Orphan Q2', 'Orphan A2');
      await initModule();
      expect(window.__curFaq).toBeDefined();
      expect(window.__curFaq!.items).toHaveLength(2);
    });

    it('starts orphan items in closed state', async () => {
      document.body.innerHTML = faqItem('Orphan Q', 'Orphan A');
      await initModule();
      const item = document.querySelector(`[${ATTR.element}="${ROLES.item}"]`);
      expect(item?.getAttribute('data-faq-open')).toBe('false');
    });

    it('mixes grouped and orphan items', async () => {
      document.body.innerHTML =
        faqGroup(faqItem('Grouped', 'In group')) + faqItem('Orphan', 'No group');
      await initModule();
      expect(window.__curFaq!.items).toHaveLength(2);
    });
  });

  describe('public API', () => {
    it('open() opens an item', async () => {
      document.body.innerHTML = faqGroup(faqItem('Q1', 'A1'));
      await initModule();
      const faq = window.__curFaq!;
      faq.open(faq.items[0]);
      expect(faq.items[0].item.getAttribute('data-faq-open')).toBe('true');
    });

    it('close() closes an item', async () => {
      document.body.innerHTML = faqGroup(faqItem('Q1', 'A1'));
      await initModule();
      const faq = window.__curFaq!;
      faq.open(faq.items[0]);
      faq.close(faq.items[0]);
      expect(faq.items[0].item.getAttribute('data-faq-open')).toBe('false');
    });

    it('toggle() toggles an item', async () => {
      document.body.innerHTML = faqGroup(faqItem('Q1', 'A1'));
      await initModule();
      const faq = window.__curFaq!;
      faq.toggle(faq.items[0]);
      expect(faq.items[0].item.getAttribute('data-faq-open')).toBe('true');
      faq.toggle(faq.items[0]);
      expect(faq.items[0].item.getAttribute('data-faq-open')).toBe('false');
    });

    it('config reflects resolved settings', async () => {
      document.body.innerHTML = faqGroup(faqItem('Q1', 'A1'));
      await initModule();
      const { config } = window.__curFaq!;
      expect(config.classes.activeClass).toBe('is-active');
      expect(config.timing.collapseDuration).toBe(250);
      expect(config.floatingSearch).toBe(false);
    });
  });

  describe('accordion mode', () => {
    it('closes siblings when opening an item in accordion mode', async () => {
      document.body.innerHTML = faqGroup(
        faqItem('Q1', 'A1') + faqItem('Q2', 'A2') + faqItem('Q3', 'A3'),
        `${ATTR.accordion}="true"`
      );
      await initModule();
      const faq = window.__curFaq!;

      faq.open(faq.items[0]);
      expect(faq.items[0].item.getAttribute('data-faq-open')).toBe('true');

      faq.open(faq.items[1]);
      expect(faq.items[0].item.getAttribute('data-faq-open')).toBe('false');
      expect(faq.items[1].item.getAttribute('data-faq-open')).toBe('true');
    });

    it('allows multiple open items when accordion is off', async () => {
      document.body.innerHTML = faqGroup(faqItem('Q1', 'A1') + faqItem('Q2', 'A2'));
      await initModule();
      const faq = window.__curFaq!;

      faq.open(faq.items[0]);
      faq.open(faq.items[1]);
      expect(faq.items[0].item.getAttribute('data-faq-open')).toBe('true');
      expect(faq.items[1].item.getAttribute('data-faq-open')).toBe('true');
    });

    it('scopes accordion mode per group', async () => {
      document.body.innerHTML =
        faqGroup(faqItem('G1-Q1', 'A') + faqItem('G1-Q2', 'A'), `${ATTR.accordion}="true"`) +
        faqGroup(faqItem('G2-Q1', 'A') + faqItem('G2-Q2', 'A'));
      await initModule();
      const faq = window.__curFaq!;

      // Open items in both groups
      faq.open(faq.items[0]); // G1-Q1
      faq.open(faq.items[2]); // G2-Q1

      // Open second item in accordion group — first should close
      faq.open(faq.items[1]); // G1-Q2
      expect(faq.items[0].item.getAttribute('data-faq-open')).toBe('false');
      expect(faq.items[1].item.getAttribute('data-faq-open')).toBe('true');

      // Non-accordion group should be unaffected
      expect(faq.items[2].item.getAttribute('data-faq-open')).toBe('true');
    });
  });

  describe('active class', () => {
    it('toggles the active class on open/close', async () => {
      document.body.innerHTML = faqGroup(faqItem('Q1', 'A1'));
      await initModule();
      const faq = window.__curFaq!;
      const itemEl = faq.items[0].item;

      expect(itemEl.classList.contains('is-active')).toBe(false);
      faq.open(faq.items[0]);
      expect(itemEl.classList.contains('is-active')).toBe(true);
      faq.close(faq.items[0]);
      expect(itemEl.classList.contains('is-active')).toBe(false);
    });

    it('uses a custom active class when configured', async () => {
      document.body.innerHTML = `
        <input ${ATTR.element}="${ROLES.search}" ${ATTR.activeClass}="faq-open" />
        ${faqGroup(faqItem('Q1', 'A1'))}
      `;
      await initModule();
      const faq = window.__curFaq!;
      faq.open(faq.items[0]);
      expect(faq.items[0].item.classList.contains('faq-open')).toBe(true);
    });
  });

  describe('icon visibility', () => {
    it('shows icon-close and hides icon-open when item is closed', async () => {
      document.body.innerHTML = faqGroup(faqItem('Q1', 'A1'));
      await initModule();
      const iconOpen = document.querySelector(`[${ATTR.element}="${ROLES.iconOpen}"]`)!;
      const iconClose = document.querySelector(`[${ATTR.element}="${ROLES.iconClose}"]`)!;
      expect(iconOpen.classList.contains('cur-faq-icon-hidden')).toBe(true);
      expect(iconClose.classList.contains('cur-faq-icon-visible')).toBe(true);
    });

    it('swaps icon visibility when item opens', async () => {
      document.body.innerHTML = faqGroup(faqItem('Q1', 'A1'));
      await initModule();
      const faq = window.__curFaq!;
      faq.open(faq.items[0]);
      const iconOpen = document.querySelector(`[${ATTR.element}="${ROLES.iconOpen}"]`)!;
      const iconClose = document.querySelector(`[${ATTR.element}="${ROLES.iconClose}"]`)!;
      expect(iconOpen.classList.contains('cur-faq-icon-visible')).toBe(true);
      expect(iconClose.classList.contains('cur-faq-icon-hidden')).toBe(true);
    });
  });

  describe('custom events', () => {
    it('dispatches cur-faq:open when an item opens', async () => {
      document.body.innerHTML = faqGroup(faqItem('Q1', 'A1'));
      await initModule();
      const faq = window.__curFaq!;

      const handler = vi.fn();
      document.addEventListener('cur-faq:open', handler);
      faq.open(faq.items[0]);
      expect(handler).toHaveBeenCalledOnce();
      document.removeEventListener('cur-faq:open', handler);
    });

    it('dispatches cur-faq:close when an item closes', async () => {
      document.body.innerHTML = faqGroup(faqItem('Q1', 'A1'));
      await initModule();
      const faq = window.__curFaq!;

      faq.open(faq.items[0]);
      const handler = vi.fn();
      document.addEventListener('cur-faq:close', handler);
      faq.close(faq.items[0]);
      expect(handler).toHaveBeenCalledOnce();
      document.removeEventListener('cur-faq:close', handler);
    });
  });

  describe('empty state', () => {
    it('shows empty state element when search has no matches', async () => {
      document.body.innerHTML = `
        <input type="search" ${ATTR.element}="${ROLES.search}" />
        <div ${ATTR.element}="${ROLES.emptyState}" style="display: none;">No results</div>
        ${faqGroup(faqItem('Apples', 'Red fruit'))}
      `;
      await initModule();
      const faq = window.__curFaq!;
      const emptyState = document.querySelector(
        `[${ATTR.element}="${ROLES.emptyState}"]`
      ) as HTMLElement;

      faq.search('zzzznotfound');
      expect(emptyState.style.display).not.toBe('none');
    });

    it('hides empty state when search is cleared', async () => {
      document.body.innerHTML = `
        <input type="search" ${ATTR.element}="${ROLES.search}" />
        <div ${ATTR.element}="${ROLES.emptyState}" style="display: none;">No results</div>
        ${faqGroup(faqItem('Apples', 'Red fruit'))}
      `;
      await initModule();
      const faq = window.__curFaq!;
      const emptyState = document.querySelector(
        `[${ATTR.element}="${ROLES.emptyState}"]`
      ) as HTMLElement;

      faq.search('zzzznotfound');
      faq.clearSearch();
      expect(emptyState.style.display).toBe('none');
    });
  });

  describe('search', () => {
    it('highlights matching text with mark elements', async () => {
      document.body.innerHTML = `
        <input type="search" ${ATTR.element}="${ROLES.search}" />
        ${faqGroup(faqItem('Password reset', 'Go to settings to reset your password.'))}
      `;
      await initModule();
      const faq = window.__curFaq!;
      faq.search('password');
      const marks = document.querySelectorAll('mark.faq-search-highlight');
      expect(marks.length).toBeGreaterThan(0);
    });

    it('opens items that match the search', async () => {
      document.body.innerHTML = `
        <input type="search" ${ATTR.element}="${ROLES.search}" />
        ${faqGroup(faqItem('Password reset', 'Reset instructions') + faqItem('Billing', 'Payment info'))}
      `;
      await initModule();
      const faq = window.__curFaq!;
      faq.search('password');

      expect(faq.items[0].item.getAttribute('data-faq-open')).toBe('true');
      expect(faq.items[1].item.getAttribute('data-faq-open')).toBe('false');
    });

    it('clearSearch removes highlights and closes search-opened items', async () => {
      document.body.innerHTML = `
        <input type="search" ${ATTR.element}="${ROLES.search}" />
        ${faqGroup(faqItem('Password reset', 'Reset instructions'))}
      `;
      await initModule();
      const faq = window.__curFaq!;
      faq.search('password');
      faq.clearSearch();

      const marks = document.querySelectorAll('mark.faq-search-highlight');
      expect(marks).toHaveLength(0);
      expect(faq.items[0].item.getAttribute('data-faq-open')).toBe('false');
    });
  });

  describe('destroy', () => {
    it('removes the style element', async () => {
      document.body.innerHTML = faqGroup(faqItem('Q1', 'A1'));
      await initModule();
      window.__curFaq!.destroy();
      expect(document.getElementById('cur-faq-styles')).toBeNull();
    });

    it('resets data attributes on items', async () => {
      document.body.innerHTML = faqGroup(faqItem('Q1', 'A1'));
      await initModule();
      const faq = window.__curFaq!;
      faq.open(faq.items[0]);
      faq.destroy();

      const item = document.querySelector(`[${ATTR.element}="${ROLES.item}"]`)!;
      expect(item.hasAttribute('data-faq-open')).toBe(false);
    });

    it('removes ARIA attributes from triggers', async () => {
      document.body.innerHTML = faqGroup(faqItem('Q1', 'A1'));
      await initModule();
      window.__curFaq!.destroy();

      const trigger = document.querySelector(`[${ATTR.element}="${ROLES.trigger}"]`)!;
      expect(trigger.hasAttribute('aria-expanded')).toBe(false);
      expect(trigger.hasAttribute('aria-controls')).toBe(false);
    });

    it('clears the global references', async () => {
      document.body.innerHTML = faqGroup(faqItem('Q1', 'A1'));
      await initModule();
      window.__curFaq!.destroy();
      expect(window.__curFaqInitialized).toBe(false);
      expect(window.__curFaq).toBeUndefined();
    });

    it('removes hidden attribute from content', async () => {
      document.body.innerHTML = faqGroup(faqItem('Q1', 'A1'));
      await initModule();
      window.__curFaq!.destroy();
      const content = document.querySelector(`[${ATTR.element}="${ROLES.content}"]`)!;
      expect(content.hasAttribute('hidden')).toBe(false);
    });
  });
});
