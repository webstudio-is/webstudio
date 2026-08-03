---
description: Style inline text spans within paragraphs in Webstudio.
---

# Inline Text Formatting

> See [MDN: \<span\>](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/span)

Webstudio provides several components for inline text formatting within paragraphs and other text containers.

## Overview

Inline formatting components allow you to style specific portions of text without affecting the entire text block. These components are typically used within [Paragraph](paragraph.md), [Text](text.md), or [Heading](heading.md) components.

## Components

### Span

The `<span>` element is a generic inline container for styling text.

**Use cases:**

- Apply custom colors to specific words
- Add backgrounds to highlighted text
- Apply multiple styles to a text portion

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `class` | string | CSS class names |

### Bold

The `<strong>` element indicates text with strong importance.

**Use cases:**

- Important warnings or key terms
- Emphasize critical information
- Highlight product names or features

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `class` | string | CSS class names |

> **Note**: Bold has semantic meaning for screen readers. Use it for important content, not just visual styling.

### Italic

The `<em>` element indicates emphasized text.

**Use cases:**

- Technical terms on first use
- Titles of works (books, movies)
- Foreign words or phrases
- Emphasis in speech

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `class` | string | CSS class names |

### Superscript

The `<sup>` element displays text slightly above the normal line.

**Use cases:**

- Footnote references¹
- Mathematical exponents (x²)
- Trademark symbols (™)
- Ordinal indicators (1st, 2nd)

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `class` | string | CSS class names |

### Subscript

The `<sub>` element displays text slightly below the normal line.

**Use cases:**

- Chemical formulas (H₂O)
- Mathematical subscripts
- Footnotes (in some styles)

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `class` | string | CSS class names |

## Using Rich Text Editing

The easiest way to apply inline formatting is through rich text editing:

1. Double-click on a text component to enter edit mode
2. Select the text you want to format
3. Use the formatting toolbar:
   - **B** for Bold
   - _I_ for Italic
   - Link icon for hyperlinks

For Superscript and Subscript, you'll need to add the component manually and position it within your text.

## Styling Tips

### Custom Highlights

```
Paragraph
└── Span (background: yellow, padding: 2px 4px)
    └── "highlighted text"
```

### Gradient Text

Apply a gradient to text using Span:

1. Add Span around text
2. Set background to gradient
3. Add `-webkit-background-clip: text`
4. Set color to transparent

### Multiple Styles

Nest formatting components for combined effects:

```
Paragraph
└── Bold
    └── Italic
        └── "bold and italic text"
```

## Accessibility Considerations

1. **Use semantic elements**: Bold (`<strong>`) conveys importance to screen readers
2. **Don't rely on color alone**: Add additional indicators for important information
3. **Maintain contrast**: Styled text should still be readable
4. **Use sparingly**: Too much formatting reduces readability

## Related Components

- [Text](text.md) - General text container
- [Paragraph](paragraph.md) - Block text content
- [Link](link.md) - Clickable text
