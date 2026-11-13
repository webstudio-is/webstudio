---
description: Highlight notes, tips, warnings, and other important information with the Alert component.
---

# Alert

Use Alert for information that deserves extra attention without interrupting the main content.

## How to use Alert

Add Alert from **Components > Text**, then edit its paragraph or add other content inside it.

Choose **Variant** under **Properties & attributes** to set the alert to **Note**, **Tip**, **Important**, **Warning**, or **Caution**.

## Styling

Style the Alert instance for its container appearance. The selected variant produces the corresponding component state, so you can style **Note**, **Tip**, **Important**, **Warning**, and **Caution** independently in the states menu.

Alerts created from GitHub-style syntax in a Content Block `.mdx` file become Alert component instances. Changing the instance's **Variant** property updates the alert marker when Webstudio saves the MDX source.

Markdown Embed supports the same variants and rendered `data-state` values.

## Related

- [Markdown Embed](markdown-embed.md) – Render GitHub-style alerts from Markdown
- [Content Block](content-block.md) – Edit MDX as component instances
- [Blockquote](blockquote.md) – Display quoted content
- [Paragraph](paragraph.md) – Add body text
