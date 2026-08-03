---
description: Paste HTML with style blocks and convert CSS classes into Webstudio styles.
---

# ↔️ HTML with CSS

When you paste HTML that includes `<style>` blocks, Webstudio extracts the CSS rules and converts class-based selectors into [design tokens](../design-tokens.md). Use this when you want pasted markup to become editable Webstudio components instead of remaining embedded code.

## How to paste HTML with CSS

1. Copy HTML that includes a `<style>` block.
2. Paste it onto the canvas in Webstudio.
3. Webstudio creates the component structure and applies matching class styles as reusable style tokens.

If a nested selector references elements not present in the pasted HTML, Webstudio shows a notification listing the skipped selectors.

If the pasted HTML/CSS references image URLs, such as `<img src="...">` or `background-image: url(...)`, Webstudio uploads those images into [Assets](../assets.md) and rewrites the pasted components/styles to use the uploaded assets.

## Related

- [CSS](./css.md) – Paste CSS declarations into the Style Panel
- [HTML with Tailwind](./html-with-tailwind.md) – Paste HTML containing Tailwind utility classes
- [Referenced images](./images.md) – Understand image handling during paste
- [Design tokens](../design-tokens.md) – Learn how reusable style packages work
- [HTML Embed](../../core-components/html-embed.md) – Embed custom HTML when you do not need native Webstudio components
