/**
 * Shared utilities for all Curio modules.
 * Import via `$utils/helpers`.
 */

/** Execute callback when the DOM is ready, or immediately if already loaded. */
export const onDomReady = (callback: () => void): void => {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback, { once: true });
  } else {
    callback();
  }
};

/** Trailing-edge debounce that returns the same function signature. */
export const debounce = <T extends (...args: never[]) => void>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timer: number | undefined;
  return (...args: Parameters<T>) => {
    if (timer !== undefined) window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  };
};

/** Assign a random ID with the given prefix if the element lacks one. Returns the ID. */
export const ensureId = (element: HTMLElement, prefix = 'cur'): string => {
  if (element.id) return element.id;
  const id = `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
  element.id = id;
  return id;
};

/** Lowercase and trim a string for case-insensitive comparison. */
export const normalizeText = (text: string): string => text.toLowerCase().trim();

/** Smooth-scroll an element into the center of the viewport with a fallback. */
export const smoothScrollTo = (element: HTMLElement): void => {
  try {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch {
    element.scrollIntoView();
  }
};
