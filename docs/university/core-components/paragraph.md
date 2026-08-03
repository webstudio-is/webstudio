---
description: Add paragraph text blocks to your Webstudio pages.
---

# Paragraph

> See [MDN: \<p\>](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/p)

The **Paragraph** component renders an HTML `<p>` element, used for blocks of body text content.

## Overview

Paragraphs are the primary component for body text and article content. They automatically include proper spacing and are semantically correct for running text.

## Properties

| Property | Type   | Description       |
| -------- | ------ | ----------------- |
| `id`     | string | Unique identifier |
| `class`  | string | CSS class names   |

## When to Use Paragraph

Use Paragraph for:

- Article body content
- Descriptions and explanations
- Any block of running text

Use other components for:

- Titles → [Heading](heading.md)
- Labels or short text → [Text](text.md)
- Inline styled text → [Inline Text](inline-text.md)

## Styling Paragraphs

### Typography

- **Font Size**: 16px minimum recommended for readability
- **Line Height**: 1.5-1.7 for comfortable reading
- **Max Width**: 65-75 characters per line is optimal
- **Margin**: Add spacing between paragraphs

### Readable Text Tips

1. **Sufficient contrast**: Minimum 4.5:1 ratio with background
2. **Comfortable line length**: Use max-width to limit text width
3. **Adequate spacing**: Line height of at least 1.5
4. **Clear font**: Use readable typefaces at appropriate sizes

## Rich Text Formatting

When editing a Paragraph, you can apply inline formatting:

- **Bold** text for emphasis
- _Italic_ text for titles or foreign words
- [Links](link.md) for navigation
- <sup>Superscript</sup> for footnotes
- <sub>Subscript</sub> for chemical formulas

## Dynamic Content

Paragraphs work well with dynamic content:

```
Collection
└── Paragraph (bound to post.content)
```

For long-form CMS content, consider using:

- [Content Embed](content-embed.md) for rich text
- [Markdown Embed](markdown-embed.md) for markdown

## Best Practices

1. **One idea per paragraph**: Keep paragraphs focused
2. **Use semantic markup**: Paragraph for text, Heading for titles
3. **Maintain readability**: Proper sizing, spacing, and contrast
4. **Consider mobile**: Text should be readable on all devices

## Related Components

- [Text](text.md) - General text container
- [Heading](heading.md) - Section titles
- [Content Embed](content-embed.md) - Rich text from CMS
