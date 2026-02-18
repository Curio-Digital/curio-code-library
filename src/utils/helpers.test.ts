import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { debounce, ensureId, normalizeText, onDomReady, smoothScrollTo } from './helpers';

describe('normalizeText', () => {
  it('lowercases and trims a string', () => {
    expect(normalizeText('  Hello World  ')).toBe('hello world');
  });

  it('handles empty string', () => {
    expect(normalizeText('')).toBe('');
  });

  it('handles already normalised text', () => {
    expect(normalizeText('already normal')).toBe('already normal');
  });
});

describe('ensureId', () => {
  it('returns the existing id when element already has one', () => {
    const el = document.createElement('div');
    el.id = 'my-id';
    expect(ensureId(el)).toBe('my-id');
  });

  it('assigns a random id with default prefix when element has no id', () => {
    const el = document.createElement('div');
    const id = ensureId(el);
    expect(id).toMatch(/^cur-[a-z0-9]+$/);
    expect(el.id).toBe(id);
  });

  it('uses a custom prefix', () => {
    const el = document.createElement('div');
    const id = ensureId(el, 'faq');
    expect(id).toMatch(/^faq-[a-z0-9]+$/);
  });

  it('returns the same id on subsequent calls', () => {
    const el = document.createElement('div');
    const first = ensureId(el);
    const second = ensureId(el);
    expect(first).toBe(second);
  });
});

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('delays execution by the given amount', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced();
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('resets the timer on subsequent calls', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced();
    vi.advanceTimersByTime(50);
    debounced();
    vi.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('passes arguments to the original function', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 50);
    debounced('a', 'b');
    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledWith('a', 'b');
  });
});

describe('onDomReady', () => {
  it('calls the callback immediately when DOM is already loaded', () => {
    const fn = vi.fn();
    onDomReady(fn);
    expect(fn).toHaveBeenCalledOnce();
  });
});

describe('smoothScrollTo', () => {
  it('calls scrollIntoView on the element', () => {
    const el = document.createElement('div');
    el.scrollIntoView = vi.fn();
    smoothScrollTo(el);
    expect(el.scrollIntoView).toHaveBeenCalled();
  });
});
