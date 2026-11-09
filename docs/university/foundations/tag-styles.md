---
description: Set site-wide styles for HTML tags such as div, h1, and button.
---

# Tag styles

**Tag styles** let you change the default appearance of an HTML tag across your site. For example, set the color of `h1` once to update every `h1` element. Tag styles extend Webstudio's preset styles for that tag.

## Add a Tag style

1. Select an instance on the canvas, such as a `div`.
2. Open the **Style sources** field at the top of the Style panel.
3. Select `div` under **Tag style**. Its source appears first in the field.
4. Select that source and set a style. The Tag style is saved when you add its first style.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="../../.gitbook/assets/tag-style-source-dark.png">
  <img src="../../.gitbook/assets/tag-style-source-light.png" alt="Style sources field with the div Tag style selected before a card Token and the Local source" width="240">
</picture>

The source appears only while you work on the selected instance. If you select another instance and return, open the field to add it again. The saved style remains in the project and continues to affect every matching tag. Only the Tag style for the selected instance's HTML tag is offered. The Global root is the `html` tag and can also have a Tag style.

## Style a state

Open the Tag style's menu and choose a state such as `:hover` or `:focus-visible`. Set styles while that state is selected. Select the state again to return to the tag's base styles.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="../../.gitbook/assets/tag-style-states-dark.png">
  <img src="../../.gitbook/assets/tag-style-states-light.png" alt="div Tag style menu with Copy above hover and focus-visible states" width="240">
</picture>

A Tag style targets its tag and state across the site. To style a descendant within one element instead, use a [custom state or selector](states-and-selectors.md#custom-states) on a Token or Local source.

## Copy and paste

Open a Tag style's menu and choose **Copy**. Paste into the **Style sources** field in another project, or use the usual paste shortcut. Webstudio merges the copied styles into the Tag style for the same tag. Pasted values replace existing values for the same property, state, and breakpoint; other styles remain. No new Token is created.

## How Tag styles combine with other styles

The Tag style source stays first in the Style sources field. Tokens follow it, and Local is last. CSS specificity and source order determine which declaration applies when several sources set the same property. Hover a property label to see its source under **Value comes from**.

Tag styles are separate from [Tokens](design-tokens.md). A Token applies to instances where you attach it; a Tag style applies to its HTML tag throughout the site without attaching it to an instance.

## Related

- [Style panel](style-panel.md) – Find and edit style sources
- [States and selectors](states-and-selectors.md) – Style hover, focus, and descendants
- [Design tokens](design-tokens.md) – Reuse styles on chosen instances
