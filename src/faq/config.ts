import type { FaqConfig, FaqGroupConfig } from './types';

/** Attribute names — single source of truth for all selectors. */
export const ATTR = {
  element: 'cur-faq-element',
  activeClass: 'cur-faq-activeclass',
  highlightClass: 'cur-faq-highlightclass',
  currentHighlightClass: 'cur-faq-currenthighlightclass',
  floatingSearch: 'cur-faq-floatingsearch',
  collapseDuration: 'cur-faq-collapse-duration',
  searchDebounce: 'cur-faq-search-debounce',
  accordion: 'cur-faq-accordion',
  defaultOpen: 'cur-faq-default-open',
  dataOpen: 'data-faq-open',
  dataOpenedBySearch: 'data-opened-by-search',
} as const;

/** Element role values used with `cur-faq-element="..."`. */
export const ROLES = {
  group: 'group',
  item: 'item',
  trigger: 'trigger',
  title: 'title',
  content: 'content',
  iconOpen: 'icon-open',
  iconClose: 'icon-close',
  search: 'search',
  emptyState: 'empty-state',
} as const;

/** CSS custom property names injected as `:root` defaults. */
export const CSS_VARS = {
  highlightBg: '--cur-faq-highlight-bg',
  currentHighlightBg: '--cur-faq-current-highlight-bg',
  collapseDuration: '--cur-faq-collapse-duration',
  iconDuration: '--cur-faq-icon-duration',
} as const;

/** Default global configuration values. */
const DEFAULTS: FaqConfig = {
  classes: {
    activeClass: 'is-active',
    highlightClass: 'faq-search-highlight',
    currentHighlightClass: 'faq-search-current',
  },
  timing: {
    collapseDuration: 250,
    iconTransitionDuration: 150,
    searchDebounce: 300,
  },
  colors: {
    highlightBackground: '#eef',
    currentHighlightBackground: '#5c6ac4',
  },
  floatingSearch: false,
};

/** Default per-group configuration values. */
const GROUP_DEFAULTS: FaqGroupConfig = {
  accordion: false,
  defaultOpen: null,
  collapseDuration: DEFAULTS.timing.collapseDuration,
};

/** Read an attribute value from an element, returning `null` if missing or empty. */
const readAttr = (el: Element | null, attr: string): string | null => {
  if (!el) return null;
  const val = el.getAttribute(attr);
  return val && val.trim() ? val.trim() : null;
};

/** Parse an integer attribute, returning `null` if invalid. */
const readIntAttr = (el: Element | null, attr: string): number | null => {
  const val = readAttr(el, attr);
  if (val === null) return null;
  const num = parseInt(val, 10);
  return Number.isNaN(num) ? null : num;
};

/** Read a boolean attribute (`"true"` = true, anything else = false). */
const readBoolAttr = (el: Element | null, attr: string): boolean | null => {
  const val = readAttr(el, attr);
  if (val === null) return null;
  return val === 'true';
};

/**
 * Resolve the global FAQ configuration by reading attributes from the search element
 * and merging with defaults.
 */
export const resolveConfig = (): FaqConfig => {
  const searchEl = document.querySelector(`[${ATTR.element}="${ROLES.search}"]`);

  return {
    classes: {
      activeClass: readAttr(searchEl, ATTR.activeClass) ?? DEFAULTS.classes.activeClass,
      highlightClass: readAttr(searchEl, ATTR.highlightClass) ?? DEFAULTS.classes.highlightClass,
      currentHighlightClass:
        readAttr(searchEl, ATTR.currentHighlightClass) ?? DEFAULTS.classes.currentHighlightClass,
    },
    timing: {
      collapseDuration: DEFAULTS.timing.collapseDuration,
      iconTransitionDuration: DEFAULTS.timing.iconTransitionDuration,
      searchDebounce: readIntAttr(searchEl, ATTR.searchDebounce) ?? DEFAULTS.timing.searchDebounce,
    },
    colors: {
      highlightBackground: DEFAULTS.colors.highlightBackground,
      currentHighlightBackground: DEFAULTS.colors.currentHighlightBackground,
    },
    floatingSearch: readBoolAttr(searchEl, ATTR.floatingSearch) ?? DEFAULTS.floatingSearch,
  };
};

/**
 * Resolve per-group configuration by reading attributes from the group element.
 * Pass `null` for orphan items (no group wrapper) to get defaults.
 */
export const resolveGroupConfig = (groupEl: HTMLElement | null): FaqGroupConfig => ({
  accordion: readBoolAttr(groupEl, ATTR.accordion) ?? GROUP_DEFAULTS.accordion,
  defaultOpen: readIntAttr(groupEl, ATTR.defaultOpen) ?? GROUP_DEFAULTS.defaultOpen,
  collapseDuration: readIntAttr(groupEl, ATTR.collapseDuration) ?? GROUP_DEFAULTS.collapseDuration,
});
