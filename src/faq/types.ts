/** Parsed DOM elements for a single FAQ item. */
export interface FaqItemElements {
  item: HTMLElement;
  trigger: HTMLElement | null;
  title: HTMLElement | null;
  content: HTMLElement | null;
  iconOpen: HTMLElement | null;
  iconClose: HTMLElement | null;
}

/** Per-group configuration resolved from attributes on the group element. */
export interface FaqGroupConfig {
  accordion: boolean;
  defaultOpen: number | null;
  collapseDuration: number;
}

/** A group element, its parsed FAQ items, and its resolved config. */
export interface FaqGroup {
  groupEl: HTMLElement;
  items: FaqItemElements[];
  config: FaqGroupConfig;
}

/** Resolved global configuration for the FAQ module. */
export interface FaqConfig {
  classes: {
    activeClass: string;
    highlightClass: string;
    currentHighlightClass: string;
  };
  timing: {
    collapseDuration: number;
    iconTransitionDuration: number;
    searchDebounce: number;
  };
  colors: {
    highlightBackground: string;
    currentHighlightBackground: string;
  };
  floatingSearch: boolean;
}

/** Mutable search state tracked during the FAQ lifecycle. */
export interface SearchState {
  marks: HTMLElement[];
  currentIndex: number;
  searchOpenedItems: Set<HTMLElement>;
}

/** Public API returned by `initFaq()`. */
export interface FaqInstance {
  readonly items: FaqItemElements[];
  readonly config: FaqConfig;
  open(item: FaqItemElements): void;
  close(item: FaqItemElements): void;
  toggle(item: FaqItemElements): void;
  search(query: string): void;
  clearSearch(): void;
  nextMatch(): void;
  prevMatch(): void;
  destroy(): void;
}

declare global {
  interface Window {
    __curFaqInitialized?: boolean;
    __curFaq?: FaqInstance;
  }
}
