import { debounce, ensureId, normalizeText, onDomReady, smoothScrollTo } from '$utils/helpers';

import { ATTR, CSS_VARS, resolveConfig, resolveGroupConfig, ROLES } from './config';
import type { FaqConfig, FaqGroup, FaqInstance, FaqItemElements, SearchState } from './types';

// ---------------------------------------------------------------------------
// DOM Parsing
// ---------------------------------------------------------------------------

/** Parse a single item element into its sub-elements. */
const parseItem = (item: HTMLElement): FaqItemElements => ({
  item,
  trigger: item.querySelector<HTMLElement>(`[${ATTR.element}="${ROLES.trigger}"]`),
  title: item.querySelector<HTMLElement>(`[${ATTR.element}="${ROLES.title}"]`),
  content: item.querySelector<HTMLElement>(`[${ATTR.element}="${ROLES.content}"]`),
  iconOpen: item.querySelector<HTMLElement>(`[${ATTR.element}="${ROLES.iconOpen}"]`),
  iconClose: item.querySelector<HTMLElement>(`[${ATTR.element}="${ROLES.iconClose}"]`),
});

/**
 * Query all FAQ groups and their child items from the DOM.
 * Items not inside any group are collected into an implicit group (groupEl = document.body).
 */
const parseFaqGroups = (): FaqGroup[] => {
  const groupEls = Array.from(
    document.querySelectorAll<HTMLElement>(`[${ATTR.element}="${ROLES.group}"]`)
  );

  const groups: FaqGroup[] = groupEls.map((groupEl) => ({
    groupEl,
    items: Array.from(
      groupEl.querySelectorAll<HTMLElement>(`[${ATTR.element}="${ROLES.item}"]`)
    ).map(parseItem),
    config: resolveGroupConfig(groupEl),
  }));

  // Collect orphan items not inside any group element
  const groupedItems = new Set(groups.flatMap((g) => g.items.map((i) => i.item)));
  const orphans = Array.from(
    document.querySelectorAll<HTMLElement>(`[${ATTR.element}="${ROLES.item}"]`)
  )
    .filter((el) => !groupedItems.has(el))
    .map(parseItem);

  if (orphans.length > 0) {
    groups.push({ groupEl: document.body, items: orphans, config: resolveGroupConfig(null) });
  }

  return groups;
};

// ---------------------------------------------------------------------------
// Search helpers
// ---------------------------------------------------------------------------

/** Check if an element's text content contains the normalised query. */
const elementContainsText = (el: HTMLElement | null, query: string): boolean =>
  el ? normalizeText(el.textContent || '').includes(query) : false;

/** Check if an item's title or content matches the query. */
const itemMatchesQuery = (item: FaqItemElements, query: string): boolean =>
  elementContainsText(item.title, query) || elementContainsText(item.content, query);

// ---------------------------------------------------------------------------
// Visibility helpers
// ---------------------------------------------------------------------------

/** Check whether an element is currently visible on-screen. */
const isElementVisible = (el: HTMLElement): boolean => {
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
};

/** Determine if a FAQ item is currently in its "open" state. */
const isItemOpen = (item: FaqItemElements): boolean => {
  if (
    item.item.getAttribute(ATTR.dataOpen) === 'true' ||
    item.trigger?.getAttribute('aria-expanded') === 'true'
  ) {
    return true;
  }
  return item.content
    ? isElementVisible(item.content) && !item.content.hasAttribute('hidden')
    : false;
};

// ---------------------------------------------------------------------------
// Highlighting (TreeWalker)
// ---------------------------------------------------------------------------

/** Remove all `<mark>` highlight wrappers inside the given root element. */
const clearHighlights = (root: HTMLElement, highlightClass: string): void => {
  Array.from(root.querySelectorAll<HTMLElement>(`mark.${highlightClass}`)).forEach((mark) => {
    const parent = mark.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(mark.textContent || ''), mark);
      parent.normalize?.();
    }
  });
};

/** Walk text nodes inside `root` and wrap query matches with `<mark>` tags. */
const highlightText = (root: HTMLElement, query: string, highlightClass: string): void => {
  if (!query) return;
  const normalised = normalizeText(query);

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return normalizeText(node.nodeValue || '').includes(normalised)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_SKIP;
    },
  });

  const textNodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    textNodes.push(current as Text);
    current = walker.nextNode();
  }

  textNodes.forEach((textNode) => {
    const original = textNode.nodeValue || '';
    const lower = normalizeText(original);
    const fragment = document.createDocumentFragment();
    let pos = 0;

    for (;;) {
      const idx = lower.indexOf(normalised, pos);
      if (idx === -1) {
        fragment.appendChild(document.createTextNode(original.slice(pos)));
        break;
      }
      if (idx > pos) fragment.appendChild(document.createTextNode(original.slice(pos, idx)));
      const mark = document.createElement('mark');
      mark.className = highlightClass;
      mark.textContent = original.slice(idx, idx + normalised.length);
      fragment.appendChild(mark);
      pos = idx + normalised.length;
    }

    const parent = textNode.parentNode;
    if (parent) parent.replaceChild(fragment, textNode);
  });
};

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

/** Set up ARIA attributes on a FAQ item's trigger/content pair. */
const setupAria = (item: FaqItemElements): void => {
  if (!item.trigger || !item.content) return;
  const contentId = ensureId(item.content, 'cur-faq');
  item.trigger.setAttribute('aria-controls', contentId);
  if (!['BUTTON'].includes(item.trigger.tagName)) {
    item.trigger.setAttribute('role', 'button');
    if (!item.trigger.hasAttribute('tabindex')) item.trigger.setAttribute('tabindex', '0');
  }
};

// ---------------------------------------------------------------------------
// Icon visibility
// ---------------------------------------------------------------------------

/** Toggle icon visibility classes (opacity-based). */
const setIconVisibility = (icon: HTMLElement | null, visible: boolean): void => {
  if (!icon) return;
  icon.classList.toggle('cur-faq-icon-visible', visible);
  icon.classList.toggle('cur-faq-icon-hidden', !visible);
};

// ---------------------------------------------------------------------------
// Collapse / Expand animation
// ---------------------------------------------------------------------------

/** WeakMap to track animation timestamps and prevent race conditions. */
const animationTimestamps = new WeakMap<HTMLElement, number>();

/** Expand a content element with a height transition. */
const expandElement = (el: HTMLElement): void => {
  const stamp = Date.now();
  animationTimestamps.set(el, stamp);
  el.removeAttribute('hidden');
  el.style.height = '0px';
  // Force reflow
  el.offsetHeight; // eslint-disable-line @typescript-eslint/no-unused-expressions
  const target = el.scrollHeight;
  el.style.height = `${target}px`;

  const onEnd = (e: TransitionEvent) => {
    if (e.propertyName === 'height' && animationTimestamps.get(el) === stamp) {
      el.removeEventListener('transitionend', onEnd);
      el.style.height = 'auto';
    }
  };
  el.addEventListener('transitionend', onEnd);
};

/** Collapse a content element with a height transition. */
const collapseElement = (el: HTMLElement): void => {
  const stamp = Date.now();
  animationTimestamps.set(el, stamp);

  if (el.hasAttribute('hidden')) {
    el.style.height = '';
    return;
  }

  const current = el.scrollHeight;
  el.style.height = `${current}px`;
  // Force reflow
  el.offsetHeight; // eslint-disable-line @typescript-eslint/no-unused-expressions
  el.style.height = '0px';

  const onEnd = (e: TransitionEvent) => {
    if (e.propertyName === 'height' && animationTimestamps.get(el) === stamp) {
      el.removeEventListener('transitionend', onEnd);
      el.setAttribute('hidden', '');
      el.style.height = '';
    }
  };
  el.addEventListener('transitionend', onEnd);
};

// ---------------------------------------------------------------------------
// Core toggle
// ---------------------------------------------------------------------------

/** Set an FAQ item to open or closed, handling icons, ARIA, attributes, and animation. */
const setItemState = (
  item: FaqItemElements,
  open: boolean,
  source: 'user' | 'search',
  config: FaqConfig,
  searchState: SearchState,
  group?: FaqGroup
): void => {
  if (!item.content || !item.trigger) return;

  // Accordion mode: close siblings before opening
  if (open && group?.config.accordion) {
    group.items.forEach((sibling) => {
      if (sibling !== item && isItemOpen(sibling)) {
        setItemState(sibling, false, source, config, searchState);
      }
    });
  }

  item.trigger.setAttribute('aria-expanded', String(open));
  item.item.setAttribute(ATTR.dataOpen, String(open));
  item.item.classList.toggle(config.classes.activeClass, open);
  setIconVisibility(item.iconOpen, open);
  setIconVisibility(item.iconClose, !open);

  if (open) {
    expandElement(item.content);
    if (source === 'search') {
      item.item.setAttribute(ATTR.dataOpenedBySearch, 'true');
      searchState.searchOpenedItems.add(item.item);
    } else {
      item.item.removeAttribute(ATTR.dataOpenedBySearch);
      searchState.searchOpenedItems.delete(item.item);
    }
  } else {
    collapseElement(item.content);
    if (source === 'search') {
      item.item.removeAttribute(ATTR.dataOpenedBySearch);
      searchState.searchOpenedItems.delete(item.item);
    }
  }

  // Dispatch custom event
  const eventName = open ? 'cur-faq:open' : 'cur-faq:close';
  item.item.dispatchEvent(
    new CustomEvent(eventName, { detail: { item: item.item }, bubbles: true })
  );
};

// ---------------------------------------------------------------------------
// Accordion: event binding
// ---------------------------------------------------------------------------

/** Bind click and keyboard listeners to FAQ triggers. Returns a cleanup function. */
const bindAccordionListeners = (
  groups: FaqGroup[],
  config: FaqConfig,
  searchState: SearchState
): (() => void) => {
  const cleanups: (() => void)[] = [];

  groups.forEach((group) => {
    group.items.forEach((faqItem) => {
      if (!faqItem.trigger) return;
      setupAria(faqItem);

      const handleToggle = (e?: Event) => {
        e?.preventDefault();
        const shouldOpen = !isItemOpen(faqItem);
        setItemState(faqItem, shouldOpen, 'user', config, searchState, group);
      };

      const handleKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleToggle(e);
        }
      };

      faqItem.trigger!.addEventListener('click', handleToggle);
      faqItem.trigger!.addEventListener('keydown', handleKeydown);
      cleanups.push(() => {
        faqItem.trigger!.removeEventListener('click', handleToggle);
        faqItem.trigger!.removeEventListener('keydown', handleKeydown);
      });
    });
  });

  return () => cleanups.forEach((fn) => fn());
};

// ---------------------------------------------------------------------------
// Style injection
// ---------------------------------------------------------------------------

const STYLE_ID = 'cur-faq-styles';

/** Inject a single `<style>` block with all FAQ behavioural styles. */
const injectStyles = (config: FaqConfig): HTMLStyleElement => {
  const existing = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (existing) {
    existing.remove();
  }

  const style = document.createElement('style');
  style.id = STYLE_ID;

  const rules: string[] = [
    // CSS custom property defaults on :root
    `:root {
  ${CSS_VARS.highlightBg}: ${config.colors.highlightBackground};
  ${CSS_VARS.currentHighlightBg}: ${config.colors.currentHighlightBackground};
  ${CSS_VARS.collapseDuration}: ${config.timing.collapseDuration}ms;
  ${CSS_VARS.iconDuration}: ${config.timing.iconTransitionDuration}ms;
}`,

    // Collapse transition
    `[${ATTR.element}="${ROLES.content}"] {
  overflow: hidden;
  transition: height var(${CSS_VARS.collapseDuration}) ease;
  will-change: height;
}`,

    // Icon transitions
    `.cur-faq-icon-visible {
  opacity: 1;
  transition: opacity var(${CSS_VARS.iconDuration}) ease;
}`,
    `.cur-faq-icon-hidden {
  opacity: 0;
  transition: opacity var(${CSS_VARS.iconDuration}) ease;
  pointer-events: none;
}`,

    // Highlight styles
    `.${config.classes.highlightClass} {
  background: var(${CSS_VARS.highlightBg});
}`,
    `.${config.classes.currentHighlightClass} {
  background: var(${CSS_VARS.currentHighlightBg});
}`,
  ];

  // Floating search panel styles (conditional)
  if (config.floatingSearch) {
    rules.push(
      `#cur-faq-floating-search {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 2147483647;
  display: flex;
  align-items: center;
  gap: 6px;
  background: #461276;
  color: white;
  border: 1px solid rgba(0,0,0,.1);
  box-shadow: 0 4px 12px rgba(0,0,0,.12);
  border-radius: 8px;
  padding: 6px 8px;
  font-family: inherit;
}`,
      `#cur-faq-floating-search button {
  border: 0;
  background: transparent;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 6px;
}`,
      `#cur-faq-floating-search button:hover {
  background: rgba(0,0,0,.06);
}`,
      `#cur-faq-floating-search input {
  width: 180px;
  padding: 4px 6px;
  border: 1px solid rgba(0,0,0,.15);
  border-radius: 6px;
  color: black;
}`,
      `#cur-faq-floating-search .counter {
  min-width: 56px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}`
    );
  }

  style.textContent = rules.join('\n');
  document.head.appendChild(style);
  return style;
};

// ---------------------------------------------------------------------------
// Search: counter
// ---------------------------------------------------------------------------

/** Update the floating panel match counter text (e.g. "2/5"). */
const updateMatchCounter = (counterEl: HTMLElement | null, searchState: SearchState): void => {
  if (!counterEl) return;
  const total = searchState.marks.length;
  const current = total === 0 || searchState.currentIndex === -1 ? 0 : searchState.currentIndex + 1;
  counterEl.textContent = `${current}/${total}`;
};

// ---------------------------------------------------------------------------
// Search: navigation
// ---------------------------------------------------------------------------

/** Scroll to and highlight the match at the given index. */
const navigateToMatch = (
  index: number,
  searchState: SearchState,
  config: FaqConfig,
  counterEl: HTMLElement | null
): void => {
  if (searchState.marks.length === 0) {
    searchState.currentIndex = -1;
    updateMatchCounter(counterEl, searchState);
    return;
  }

  const len = searchState.marks.length;
  searchState.currentIndex = ((index % len) + len) % len;

  document
    .querySelectorAll(`.${config.classes.currentHighlightClass}`)
    .forEach((el) => el.classList.remove(config.classes.currentHighlightClass));

  const target = searchState.marks[searchState.currentIndex];
  target.classList.add(config.classes.currentHighlightClass);
  smoothScrollTo(target);
  updateMatchCounter(counterEl, searchState);
};

/** Advance the current match index by `delta` (+1 = next, -1 = prev). */
const advanceMatch = (
  delta: number,
  searchState: SearchState,
  config: FaqConfig,
  counterEl: HTMLElement | null
): void => {
  if (searchState.marks.length === 0) return;
  const base = searchState.currentIndex === -1 ? 0 : searchState.currentIndex;
  navigateToMatch(base + delta, searchState, config, counterEl);
};

// ---------------------------------------------------------------------------
// Search: empty state
// ---------------------------------------------------------------------------

/** Show or hide the empty-state element based on whether there are matches. */
const updateEmptyState = (hasMatches: boolean): void => {
  const emptyStateEl = document.querySelector<HTMLElement>(
    `[${ATTR.element}="${ROLES.emptyState}"]`
  );
  if (!emptyStateEl) return;
  emptyStateEl.style.display = hasMatches ? 'none' : '';
};

// ---------------------------------------------------------------------------
// Search: core
// ---------------------------------------------------------------------------

/** Clear all highlights and reset search marks state. */
const clearAllHighlights = (
  allItems: FaqItemElements[],
  searchState: SearchState,
  config: FaqConfig
): void => {
  allItems.forEach(({ item }) => clearHighlights(item, config.classes.highlightClass));
  document
    .querySelectorAll(`.${config.classes.currentHighlightClass}`)
    .forEach((el) => el.classList.remove(config.classes.currentHighlightClass));
  searchState.marks = [];
  searchState.currentIndex = -1;
};

/** Run a search across all FAQ items, highlighting matches and opening matching items. */
const performSearch = (
  query: string,
  allItems: FaqItemElements[],
  searchState: SearchState,
  config: FaqConfig,
  counterEl: HTMLElement | null
): void => {
  const normalised = normalizeText(query);
  clearAllHighlights(allItems, searchState, config);

  if (!normalised) {
    updateEmptyState(true);
    return;
  }

  // Close items that were opened by search but no longer match
  allItems.forEach((faqItem) => {
    if (
      searchState.searchOpenedItems.has(faqItem.item) &&
      !itemMatchesQuery(faqItem, normalised) &&
      isItemOpen(faqItem)
    ) {
      setItemState(faqItem, false, 'search', config, searchState);
    }
  });

  // Highlight matches and open matching items
  allItems.forEach((faqItem) => {
    const titleMatch = elementContainsText(faqItem.title, normalised);
    const contentMatch = elementContainsText(faqItem.content, normalised);
    if (titleMatch || contentMatch) {
      if (faqItem.title) highlightText(faqItem.title, normalised, config.classes.highlightClass);
      if (faqItem.content)
        highlightText(faqItem.content, normalised, config.classes.highlightClass);
      setItemState(faqItem, true, 'search', config, searchState);
    }
  });

  searchState.marks = Array.from(
    document.querySelectorAll<HTMLElement>(`mark.${config.classes.highlightClass}`)
  );

  const hasMatches = searchState.marks.length > 0;
  updateEmptyState(hasMatches);

  if (hasMatches) {
    searchState.currentIndex = 0;
    navigateToMatch(0, searchState, config, counterEl);
  }

  // Dispatch search event
  document.querySelector(`[${ATTR.element}="${ROLES.group}"]`)?.dispatchEvent(
    new CustomEvent('cur-faq:search', {
      detail: { query, matchCount: searchState.marks.length },
      bubbles: true,
    })
  );
};

// ---------------------------------------------------------------------------
// Search: input binding
// ---------------------------------------------------------------------------

/** Bind search behaviour to an input element. Returns a cleanup function. */
const bindSearchInput = (
  input: HTMLInputElement,
  allItems: FaqItemElements[],
  searchState: SearchState,
  config: FaqConfig,
  counterEl: HTMLElement | null,
  floatingPanel: HTMLElement | null,
  floatingInput: HTMLInputElement | null,
  isMainInput: boolean
): (() => void) => {
  const debouncedSearch = debounce(() => {
    const value = input.value || '';

    if (!value.trim()) {
      clearAllHighlights(allItems, searchState, config);
      // Close items that were opened by search
      allItems.forEach((faqItem) => {
        if (searchState.searchOpenedItems.has(faqItem.item) && isItemOpen(faqItem)) {
          setItemState(faqItem, false, 'search', config, searchState);
        }
      });
      updateMatchCounter(counterEl, searchState);
      updateEmptyState(true);

      if (isMainInput && floatingPanel) {
        floatingPanel.style.display = 'none';
      }
      return;
    }

    performSearch(value, allItems, searchState, config, counterEl);

    if (isMainInput && config.floatingSearch) {
      if (floatingPanel) floatingPanel.style.display = 'flex';
      if (floatingInput && floatingInput !== input && floatingInput.value !== value) {
        floatingInput.value = value;
      }
    }

    // Sync the other input
    if (!isMainInput && floatingInput) {
      const mainInput = document.querySelector<HTMLInputElement>(
        `[${ATTR.element}="${ROLES.search}"] input[type="search"], ` +
          `[${ATTR.element}="${ROLES.search}"] input[type="text"], ` +
          `input[${ATTR.element}="${ROLES.search}"]`
      );
      if (mainInput && mainInput !== input && mainInput.value !== value) {
        mainInput.value = value;
      }
    }
  }, config.timing.searchDebounce);

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (e.shiftKey) {
        advanceMatch(-1, searchState, config, counterEl);
      } else {
        advanceMatch(1, searchState, config, counterEl);
      }
    }
  };

  input.addEventListener('keydown', handleKeydown);
  input.addEventListener('input', debouncedSearch);

  return () => {
    input.removeEventListener('keydown', handleKeydown);
    input.removeEventListener('input', debouncedSearch);
  };
};

// ---------------------------------------------------------------------------
// Search: floating panel
// ---------------------------------------------------------------------------

/**
 * Create the floating search panel DOM.
 * Returns the panel element, counter element, input element, and a cleanup function.
 */
const createFloatingPanel = (
  allItems: FaqItemElements[],
  searchState: SearchState,
  config: FaqConfig
): {
  panel: HTMLElement;
  counter: HTMLElement;
  input: HTMLInputElement;
  cleanup: () => void;
} => {
  const panel = document.createElement('div');
  panel.id = 'cur-faq-floating-search';
  panel.style.display = 'none';

  const prevBtn = document.createElement('button');
  prevBtn.setAttribute('type', 'button');
  prevBtn.setAttribute('aria-label', 'Previous match');
  prevBtn.textContent = '\u2191';

  const nextBtn = document.createElement('button');
  nextBtn.setAttribute('type', 'button');
  nextBtn.setAttribute('aria-label', 'Next match');
  nextBtn.textContent = '\u2193';

  const input = document.createElement('input');
  input.type = 'search';
  input.placeholder = 'Search FAQ\u2026';
  input.setAttribute('aria-label', 'Search FAQ');

  const counter = document.createElement('span');
  counter.className = 'counter';
  counter.textContent = '0/0';

  panel.appendChild(prevBtn);
  panel.appendChild(nextBtn);
  panel.appendChild(input);
  panel.appendChild(counter);
  document.body.appendChild(panel);

  const handlePrev = () => advanceMatch(-1, searchState, config, counter);
  const handleNext = () => advanceMatch(1, searchState, config, counter);

  prevBtn.addEventListener('click', handlePrev);
  nextBtn.addEventListener('click', handleNext);

  const inputCleanup = bindSearchInput(
    input,
    allItems,
    searchState,
    config,
    counter,
    panel,
    input,
    false
  );

  updateMatchCounter(counter, searchState);

  const cleanup = () => {
    prevBtn.removeEventListener('click', handlePrev);
    nextBtn.removeEventListener('click', handleNext);
    inputCleanup();
    panel.remove();
  };

  return { panel, counter, input, cleanup };
};

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

/** Initialise the FAQ module. Returns a `FaqInstance` for programmatic control. */
const initFaq = (): FaqInstance | undefined => {
  if (window.__curFaqInitialized) return window.__curFaq;
  window.__curFaqInitialized = true;

  const config = resolveConfig();
  const groups = parseFaqGroups();
  const allItems = groups.flatMap((g) => g.items);

  const searchState: SearchState = {
    marks: [],
    currentIndex: -1,
    searchOpenedItems: new Set(),
  };

  // Inject styles
  const styleEl = injectStyles(config);

  // Apply per-group collapse duration overrides via CSS variable inheritance
  groups.forEach((group) => {
    if (
      group.groupEl !== document.body &&
      group.config.collapseDuration !== config.timing.collapseDuration
    ) {
      group.groupEl.style.setProperty(
        CSS_VARS.collapseDuration,
        `${group.config.collapseDuration}ms`
      );
    }
  });

  // Set initial state: all items closed
  allItems.forEach((faqItem) => {
    if (faqItem.content) {
      faqItem.content.setAttribute('hidden', '');
      faqItem.item.setAttribute(ATTR.dataOpen, 'false');
      faqItem.trigger?.setAttribute('aria-expanded', 'false');
      faqItem.item.classList.remove(config.classes.activeClass);
      setIconVisibility(faqItem.iconOpen, false);
      setIconVisibility(faqItem.iconClose, true);
    }
  });

  // Default open item(s) — per-group setting
  groups.forEach((group) => {
    if (group.config.defaultOpen !== null) {
      const target = group.items[group.config.defaultOpen];
      if (target) {
        setItemState(target, true, 'user', config, searchState, group);
      }
    }
  });

  // Bind accordion listeners
  const removeAccordionListeners = bindAccordionListeners(groups, config, searchState);

  // Hide empty state initially
  updateEmptyState(true);

  // Search input binding
  const searchCleanups: (() => void)[] = [];
  let counterEl: HTMLElement | null = null;
  let floatingPanel: HTMLElement | null = null;
  let floatingInput: HTMLInputElement | null = null;
  let floatingCleanup: (() => void) | null = null;

  const searchEl = document.querySelector<HTMLElement>(`[${ATTR.element}="${ROLES.search}"]`);
  if (searchEl) {
    const isInput = searchEl.tagName === 'INPUT';
    const mainInput = isInput
      ? (searchEl as HTMLInputElement)
      : searchEl.querySelector<HTMLInputElement>('input[type="search"], input[type="text"]');

    if (mainInput) {
      // Create floating panel if needed (must exist before binding main input)
      if (config.floatingSearch) {
        const floating = createFloatingPanel(allItems, searchState, config);
        floatingPanel = floating.panel;
        counterEl = floating.counter;
        floatingInput = floating.input;
        floatingCleanup = floating.cleanup;
      }

      const mainCleanup = bindSearchInput(
        mainInput,
        allItems,
        searchState,
        config,
        counterEl,
        floatingPanel,
        floatingInput,
        true
      );
      searchCleanups.push(mainCleanup);
    }
  }

  // Build public API
  const findGroup = (item: FaqItemElements): FaqGroup | undefined =>
    groups.find((g) => g.items.includes(item));

  const instance: FaqInstance = {
    items: allItems,
    config,

    open(item: FaqItemElements) {
      setItemState(item, true, 'user', config, searchState, findGroup(item));
    },

    close(item: FaqItemElements) {
      setItemState(item, false, 'user', config, searchState, findGroup(item));
    },

    toggle(item: FaqItemElements) {
      const shouldOpen = !isItemOpen(item);
      setItemState(item, shouldOpen, 'user', config, searchState, findGroup(item));
    },

    search(query: string) {
      performSearch(query, allItems, searchState, config, counterEl);
    },

    clearSearch() {
      clearAllHighlights(allItems, searchState, config);
      allItems.forEach((faqItem) => {
        if (searchState.searchOpenedItems.has(faqItem.item) && isItemOpen(faqItem)) {
          setItemState(faqItem, false, 'search', config, searchState);
        }
      });
      updateMatchCounter(counterEl, searchState);
      updateEmptyState(true);
    },

    nextMatch() {
      advanceMatch(1, searchState, config, counterEl);
    },

    prevMatch() {
      advanceMatch(-1, searchState, config, counterEl);
    },

    destroy() {
      removeAccordionListeners();
      searchCleanups.forEach((fn) => fn());
      if (floatingCleanup) floatingCleanup();
      styleEl.remove();
      // Remove per-group CSS var overrides
      groups.forEach((group) => {
        if (group.groupEl !== document.body) {
          group.groupEl.style.removeProperty(CSS_VARS.collapseDuration);
        }
      });
      // Reset state
      clearAllHighlights(allItems, searchState, config);
      allItems.forEach((faqItem) => {
        faqItem.item.removeAttribute(ATTR.dataOpen);
        faqItem.item.removeAttribute(ATTR.dataOpenedBySearch);
        faqItem.item.classList.remove(config.classes.activeClass);
        faqItem.trigger?.removeAttribute('aria-expanded');
        faqItem.trigger?.removeAttribute('aria-controls');
        if (faqItem.content) {
          faqItem.content.removeAttribute('hidden');
          faqItem.content.style.height = '';
        }
      });
      window.__curFaqInitialized = false;
      delete window.__curFaq;
    },
  };

  window.__curFaq = instance;
  return instance;
};

// ---------------------------------------------------------------------------
// Auto-init on DOM ready
// ---------------------------------------------------------------------------

onDomReady(initFaq);
