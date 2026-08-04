---
description: Display source code with language-aware syntax highlighting.
---

# Code Text

Use Code Text to display source code with syntax highlighting. It renders a
semantic `<code>` element and preserves the source text for copying and screen
readers.

## When to use

Use Code Text for code examples, commands, configuration, or other source text.
Use [Text](text.md) for prose that does not need syntax highlighting.

## How to use

1. Open the **Components** panel.
2. Expand **Typography**.
3. Drag **Code Text** onto the canvas.
4. Enter the source in **Code** in the Settings panel, or edit it on the canvas.
5. Select the matching **Language**.
6. Select a **Theme**.

You can bind **Code**, **Language**, and **Theme** to variables or resource
values. A fixed Language or Theme includes only that selected asset in the
published build. A bound Language or Theme makes the available catalog part of
the server build so any runtime value can be rendered. The browser loads only
the language and theme selected at runtime.

The highlighted markup is rendered with SSR and SSG output, so it appears
consistently when the page first loads and after it becomes interactive.

## Styling

Apply typography, spacing, border, and background styles in the Style panel.
The selected theme supplies the syntax token colors and initial text and
background colors. A background set in the Style panel overrides the theme
background; select another theme to change the syntax colors.

## Related

- [Text](text.md)
- [HTML Embed](html-embed.md)
- [Paragraph](paragraph.md)
