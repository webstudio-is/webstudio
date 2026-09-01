---
description: Highlight notes, tips, warnings, and other important information with the Alert component.
---

# Alert

Use Alert for information that deserves extra attention without interrupting the main content.

## How to use Alert

Add Alert from **Components > Text**, then edit its paragraph or add other content inside it.

Choose **Variant** under **Properties & attributes** to set the alert to **Note**, **Tip**, **Important**, **Warning**, or **Caution**. The variant changes the visible title and exposes a matching class such as `markdown-alert-warning` for styling.

## Styling

Style the Alert instance for its container appearance. Select its **Alert title** descendant to style the generated title independently from the authored content.

Alerts created from GitHub-style syntax in a Content Block `.mdx` file become Alert component instances. Changing the instance's **Variant** property updates the alert marker when Webstudio saves the MDX source.

Markdown Embed supports the same variants and markup contract, so styles based on the `markdown-alert` classes can be applied consistently.

## Related

- [Markdown Embed](markdown-embed.md) – Render GitHub-style alerts from Markdown
- [Content Block](content-block.md) – Edit MDX as component instances
- [Blockquote](blockquote.md) – Display quoted content
- [Paragraph](paragraph.md) – Add body text
