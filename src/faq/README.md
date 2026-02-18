# Curio FAQ Module

Accordion and search component for Webflow. Drop the script onto a page, mark up your HTML with `cur-faq-*` attributes, and everything works automatically — no extra JavaScript required.

## Quick start

1. Add the script to the page:

```html
<script defer src="https://cdn.jsdelivr.net/npm/@curioapps/code-library/dist/faq/index.js"></script>
```

2. Structure your HTML (any tags work — these are just examples):

```html
<div cur-faq-element="group">
  <div cur-faq-element="item">
    <button cur-faq-element="trigger">
      <span cur-faq-element="title">How do I reset my password?</span>
      <span cur-faq-element="icon-open">+</span>
      <span cur-faq-element="icon-close">-</span>
    </button>
    <div cur-faq-element="content">
      <div>Go to Settings > Security > Reset password.</div>
    </div>
  </div>

  <div cur-faq-element="item">
    <button cur-faq-element="trigger">
      <span cur-faq-element="title">Can I change my username?</span>
      <span cur-faq-element="icon-open">+</span>
      <span cur-faq-element="icon-close">-</span>
    </button>
    <div cur-faq-element="content">
      <div>Yes — visit your Profile page and click Edit.</div>
    </div>
  </div>
</div>
```

That's it. Items start collapsed and open/close on click with a smooth height animation.

---

## Element roles

Every element is identified by the `cur-faq-element` attribute. Nest them as shown in the hierarchy below.

| Attribute value | Required | Element                      | Purpose                                                                                                                                                      |
| --------------- | -------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `group`         | No       | Wrapper                      | Groups a set of FAQ items together. You can have multiple groups on one page, each with its own settings. **Optional** — items work without a group wrapper. |
| `item`          | Yes      | Inside `group` or standalone | A single FAQ entry (question + answer).                                                                                                                      |
| `trigger`       | Yes      | Inside `item`                | The clickable area that toggles the item open/closed.                                                                                                        |
| `title`         | No       | Inside `trigger`             | The question text. Used for search matching.                                                                                                                 |
| `content`       | Yes      | Inside `item`                | The collapsible answer area. Hidden by default.                                                                                                              |
| `icon-open`     | No       | Inside `trigger`             | Icon shown when the item **is open** (e.g. a minus or chevron-up). Hidden when closed.                                                                       |
| `icon-close`    | No       | Inside `trigger`             | Icon shown when the item **is closed** (e.g. a plus or chevron-down). Hidden when open.                                                                      |
| `search`        | No       | Anywhere                     | Search input binding. Can be an `<input>` directly or a wrapper containing one.                                                                              |
| `empty-state`   | No       | Anywhere                     | Element shown when a search returns zero results. Hidden at all other times.                                                                                 |

### Nesting hierarchy

```
group                    (optional wrapper)
  item
    trigger
      title              (optional)
      icon-open           (optional)
      icon-close          (optional)
    content
  item
    ...

item                     (standalone — works without a group)
  trigger
    ...
  content

search                   (anywhere on page)
empty-state               (anywhere on page)
```

> **Groups are optional.** If you don't need per-group settings like accordion mode, you can place `item` elements anywhere on the page without wrapping them in a `group`. They'll work the same way — click to open/close, search, keyboard navigation, etc.

---

## Configuration attributes

Set these on the `search` or `group` element to customise behaviour. All are optional — sensible defaults apply.

### On the search element

| Attribute                       | Type        | Default                | Description                                                                                                  |
| ------------------------------- | ----------- | ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| `cur-faq-activeclass`           | string      | `is-active`            | CSS class toggled on open items.                                                                             |
| `cur-faq-highlightclass`        | string      | `faq-search-highlight` | CSS class applied to `<mark>` elements wrapping search matches.                                              |
| `cur-faq-currenthighlightclass` | string      | `faq-search-current`   | CSS class applied to the currently focused match.                                                            |
| `cur-faq-floatingsearch`        | `"true"`    | `false`                | Enables a fixed floating search panel in the bottom-right corner with prev/next buttons and a match counter. |
| `cur-faq-search-debounce`       | number (ms) | `300`                  | Debounce delay before search executes after typing stops.                                                    |

### On each group element (per-group)

These are resolved **individually per group**, so different groups on the same page can have different settings.

| Attribute                   | Type        | Default | Description                                                                                                                       |
| --------------------------- | ----------- | ------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `cur-faq-accordion`         | `"true"`    | `false` | Accordion mode — only one item can be open at a time within this group. Opening an item auto-closes the others.                   |
| `cur-faq-default-open`      | number      | none    | Zero-based index of the item to open on page load.                                                                                |
| `cur-faq-collapse-duration` | number (ms) | `250`   | Duration of the expand/collapse height animation. Overrides the global `--cur-faq-collapse-duration` CSS variable for this group. |

### Example with configuration

```html
<!-- Search with floating panel and custom active class -->
<input
  type="search"
  placeholder="Search FAQ..."
  cur-faq-element="search"
  cur-faq-floatingsearch="true"
  cur-faq-activeclass="faq-open"
/>

<!-- "No results" message, hidden until needed -->
<div cur-faq-element="empty-state" style="display: none;">No matching questions found.</div>

<!-- Accordion group with first item open by default -->
<div cur-faq-element="group" cur-faq-accordion="true" cur-faq-default-open="0">...</div>

<!-- Second group: no accordion, slower animation, second item open -->
<div cur-faq-element="group" cur-faq-collapse-duration="400" cur-faq-default-open="1">...</div>

<!-- Standalone items (no group needed) -->
<div cur-faq-element="item">
  <button cur-faq-element="trigger">
    <span cur-faq-element="title">A standalone question</span>
  </button>
  <div cur-faq-element="content">Works without a group wrapper.</div>
</div>
```

---

## CSS custom properties

The script injects default values on `:root`. Override them anywhere in your stylesheet to change colours and timing without touching JavaScript.

| Variable                         | Default   | Description                                       |
| -------------------------------- | --------- | ------------------------------------------------- |
| `--cur-faq-highlight-bg`         | `#eef`    | Background colour of search match highlights.     |
| `--cur-faq-current-highlight-bg` | `#5c6ac4` | Background colour of the currently focused match. |
| `--cur-faq-collapse-duration`    | `250ms`   | Duration of the expand/collapse animation.        |
| `--cur-faq-icon-duration`        | `150ms`   | Duration of the icon opacity transition.          |

```css
/* Example: override highlight colours */
:root {
  --cur-faq-highlight-bg: #fff3cd;
  --cur-faq-current-highlight-bg: #fd7e14;
}
```

---

## Runtime attributes (set by JavaScript)

These are added and updated automatically. Use them in your CSS for custom styling.

| Attribute               | Set on | Values               | Description                                                                    |
| ----------------------- | ------ | -------------------- | ------------------------------------------------------------------------------ |
| `data-faq-open`         | `item` | `"true"` / `"false"` | Whether the item is currently open.                                            |
| `data-opened-by-search` | `item` | `"true"` or absent   | Present when the item was opened by a search match (not by the user clicking). |

```css
/* Example: style items differently when opened by search */
[data-opened-by-search='true'] {
  border-left: 3px solid #5c6ac4;
}
```

---

## Search behaviour

When a `search` element is present:

1. **Typing** — After the debounce delay, all item titles and content are searched. Matching text is wrapped in `<mark>` tags with the highlight class.
2. **Auto-open** — Items with matches are automatically expanded. Items previously opened by search that no longer match are collapsed.
3. **Match navigation** — Press `Enter` to jump to the next match, `Shift+Enter` for the previous match. The current match scrolls into view with a distinct highlight.
4. **Clear** — Emptying the search input clears all highlights and collapses search-opened items.
5. **Empty state** — If no items match, the `empty-state` element is shown. It hides again when the search is cleared or matches are found.
6. **Floating panel** — When `cur-faq-floatingsearch="true"`, a fixed panel appears with its own search input, prev/next buttons, and a match counter (e.g. "2/5"). Both inputs stay synced.

---

## Custom events

All events bubble and can be listened to on any ancestor.

| Event            | Dispatched on | `detail`                                | When                                    |
| ---------------- | ------------- | --------------------------------------- | --------------------------------------- |
| `cur-faq:open`   | `item`        | `{ item: HTMLElement }`                 | An item is opened (by click or search). |
| `cur-faq:close`  | `item`        | `{ item: HTMLElement }`                 | An item is closed.                      |
| `cur-faq:search` | `group`       | `{ query: string, matchCount: number }` | A search is performed.                  |

```js
document.addEventListener('cur-faq:open', (e) => {
  console.log('Opened:', e.detail.item);
});

document.addEventListener('cur-faq:search', (e) => {
  console.log(`"${e.detail.query}" — ${e.detail.matchCount} matches`);
});
```

---

## JavaScript API

After initialisation, `window.__curFaq` exposes a programmatic API.

| Method / Property | Description                                                       |
| ----------------- | ----------------------------------------------------------------- |
| `items`           | Array of all parsed FAQ items (`FaqItemElements[]`).              |
| `config`          | The resolved configuration object.                                |
| `open(item)`      | Open a specific item.                                             |
| `close(item)`     | Close a specific item.                                            |
| `toggle(item)`    | Toggle a specific item.                                           |
| `search(query)`   | Programmatically trigger a search.                                |
| `clearSearch()`   | Clear search highlights and close search-opened items.            |
| `nextMatch()`     | Navigate to the next search match.                                |
| `prevMatch()`     | Navigate to the previous search match.                            |
| `destroy()`       | Remove all event listeners, injected styles, and reset DOM state. |

```js
// Open the third item
const faq = window.__curFaq;
faq.open(faq.items[2]);

// Programmatic search
faq.search('password');

// Clean up everything
faq.destroy();
```

---

## Accessibility

The module automatically sets up:

- `aria-expanded` on triggers (synced with open/close state).
- `aria-controls` linking each trigger to its content panel.
- `role="button"` and `tabindex="0"` on non-`<button>` triggers so they are keyboard-focusable.
- `Space` and `Enter` keys toggle items when a trigger is focused.

---

## Webflow setup tips

1. **Trigger element** — Use a `div` block with `cur-faq-element="trigger"`. Webflow doesn't allow custom attributes on native links easily, so a div works best.
2. **Icons** — Place two elements (e.g. SVG icons or text) inside the trigger. Give one `cur-faq-element="icon-open"` and the other `cur-faq-element="icon-close"`. The script handles their visibility with opacity transitions — no Webflow interactions needed.
3. **Content** — The `content` element must be a direct child of `item`. Do not set display/visibility on it in Webflow; the script controls its `hidden` attribute and height.
4. **Active class styling** — Add a combo class called `is-active` (or your custom name) in Webflow to style the open state. The script toggles it automatically.
5. **Multiple groups** — You can have separate `group` elements on the same page. Each group resolves its own settings (accordion, default-open, collapse duration) independently.
6. **No group needed** — If you just need simple open/close items without accordion or per-group settings, skip the `group` wrapper entirely. Items found outside any group work the same way.

---

## Attribute convention

This module follows the Curio attribute convention used across all modules:

| Pattern                         | Purpose                   | Example                     |
| ------------------------------- | ------------------------- | --------------------------- |
| `cur-{module}-element="{role}"` | Identifies element roles  | `cur-faq-element="trigger"` |
| `cur-{module}-{setting}`        | Configuration             | `cur-faq-accordion="true"`  |
| `data-{module}-{state}`         | Runtime state (set by JS) | `data-faq-open="true"`      |
| `--cur-{module}-{property}`     | CSS custom properties     | `--cur-faq-highlight-bg`    |
