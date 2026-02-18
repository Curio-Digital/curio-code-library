import { afterEach, describe, expect, it } from 'vitest';

import { ATTR, resolveConfig, resolveGroupConfig, ROLES } from './config';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('resolveConfig', () => {
  it('returns defaults when no search element exists', () => {
    const config = resolveConfig();
    expect(config.classes.activeClass).toBe('is-active');
    expect(config.classes.highlightClass).toBe('faq-search-highlight');
    expect(config.classes.currentHighlightClass).toBe('faq-search-current');
    expect(config.timing.collapseDuration).toBe(250);
    expect(config.timing.iconTransitionDuration).toBe(150);
    expect(config.timing.searchDebounce).toBe(300);
    expect(config.floatingSearch).toBe(false);
  });

  it('reads class overrides from the search element', () => {
    document.body.innerHTML = `
      <input
        ${ATTR.element}="${ROLES.search}"
        ${ATTR.activeClass}="custom-active"
        ${ATTR.highlightClass}="custom-highlight"
        ${ATTR.currentHighlightClass}="custom-current"
      />
    `;
    const config = resolveConfig();
    expect(config.classes.activeClass).toBe('custom-active');
    expect(config.classes.highlightClass).toBe('custom-highlight');
    expect(config.classes.currentHighlightClass).toBe('custom-current');
  });

  it('reads floatingSearch from the search element', () => {
    document.body.innerHTML = `
      <input ${ATTR.element}="${ROLES.search}" ${ATTR.floatingSearch}="true" />
    `;
    expect(resolveConfig().floatingSearch).toBe(true);
  });

  it('reads searchDebounce from the search element', () => {
    document.body.innerHTML = `
      <input ${ATTR.element}="${ROLES.search}" ${ATTR.searchDebounce}="500" />
    `;
    expect(resolveConfig().timing.searchDebounce).toBe(500);
  });

  it('ignores empty attribute values and falls back to defaults', () => {
    document.body.innerHTML = `
      <input ${ATTR.element}="${ROLES.search}" ${ATTR.activeClass}="  " />
    `;
    expect(resolveConfig().classes.activeClass).toBe('is-active');
  });
});

describe('resolveGroupConfig', () => {
  it('returns defaults when group element is null', () => {
    const config = resolveGroupConfig(null);
    expect(config.accordion).toBe(false);
    expect(config.defaultOpen).toBeNull();
    expect(config.collapseDuration).toBe(250);
  });

  it('returns defaults when group has no attributes', () => {
    const el = document.createElement('div');
    const config = resolveGroupConfig(el);
    expect(config.accordion).toBe(false);
    expect(config.defaultOpen).toBeNull();
    expect(config.collapseDuration).toBe(250);
  });

  it('reads accordion from the group element', () => {
    const el = document.createElement('div');
    el.setAttribute(ATTR.accordion, 'true');
    expect(resolveGroupConfig(el).accordion).toBe(true);
  });

  it('reads defaultOpen from the group element', () => {
    const el = document.createElement('div');
    el.setAttribute(ATTR.defaultOpen, '2');
    expect(resolveGroupConfig(el).defaultOpen).toBe(2);
  });

  it('reads collapseDuration from the group element', () => {
    const el = document.createElement('div');
    el.setAttribute(ATTR.collapseDuration, '400');
    expect(resolveGroupConfig(el).collapseDuration).toBe(400);
  });

  it('ignores non-numeric defaultOpen', () => {
    const el = document.createElement('div');
    el.setAttribute(ATTR.defaultOpen, 'abc');
    expect(resolveGroupConfig(el).defaultOpen).toBeNull();
  });

  it('resolves different configs for different groups', () => {
    const group1 = document.createElement('div');
    group1.setAttribute(ATTR.accordion, 'true');
    group1.setAttribute(ATTR.defaultOpen, '0');

    const group2 = document.createElement('div');
    group2.setAttribute(ATTR.collapseDuration, '500');

    const config1 = resolveGroupConfig(group1);
    const config2 = resolveGroupConfig(group2);

    expect(config1.accordion).toBe(true);
    expect(config1.defaultOpen).toBe(0);
    expect(config1.collapseDuration).toBe(250);

    expect(config2.accordion).toBe(false);
    expect(config2.defaultOpen).toBeNull();
    expect(config2.collapseDuration).toBe(500);
  });
});
