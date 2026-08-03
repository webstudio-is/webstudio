---
description: Add and style text content in Webstudio with the Text component.
---

# Text

> See [MDN: \<span\>](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/span)

The **Text** component is used to display text content in your Webstudio projects. It provides a flexible container for adding and styling text.

## Overview

Text is the primary component for adding readable content to your pages. Unlike the Heading or Paragraph components which have more specific semantic purposes, Text is a general-purpose text container.

## Tag Options

Text can render different HTML elements:

| Tag          | Use Case                               |
| ------------ | -------------------------------------- |
| `div`        | Block-level text container (default)   |
| `span`       | Inline text container                  |
| `cite`       | Citation or reference to creative work |
| `figcaption` | Caption for a figure element           |

## Properties

| Property | Type   | Description                             |
| -------- | ------ | --------------------------------------- |
| `tag`    | string | HTML element to render (default: `div`) |
| `id`     | string | Unique identifier for the element       |
| `class`  | string | CSS class names                         |

## When to Use Text vs Other Components

| Component     | Use Case                               |
| ------------- | -------------------------------------- |
| **Text**      | General text content, captions, labels |
| **Heading**   | Section titles (h1-h6)                 |
| **Paragraph** | Body text, article content             |
| **Span**      | Inline text styling within other text  |

## Styling Text

### Typography Properties

- **Font Family**: Choose from system fonts or custom fonts
- **Font Size**: Set the size in various units (px, rem, em)
- **Font Weight**: Light, normal, medium, bold, etc.
- **Line Height**: Spacing between lines
- **Letter Spacing**: Spacing between characters
- **Text Align**: Left, center, right, justify
- **Color**: Text color

### Text Effects

- **Text Shadow**: Add shadow effects
- **Text Transform**: Uppercase, lowercase, capitalize
- **Text Decoration**: Underline, overline, line-through
- **Text Overflow**: Ellipsis for truncated text

## Rich Text Editing

When you double-click on a Text component in the canvas, you enter rich text editing mode where you can:

- Apply **Bold** formatting
- Apply _Italic_ formatting
- Add [Links](link.md)
- Use inline formatting like Superscript and Subscript

## Dynamic Content

Text components can display dynamic content using variables:

1. Select the Text component
2. In the Settings panel, click the binding icon next to content
3. Choose a variable or expression

Example use cases:

- Display CMS content
- Show user data
- Render computed values

## Best Practices

1. **Use semantic components** - Choose Heading for titles and Paragraph for body text when appropriate

2. **Set readable font sizes** - Body text should typically be 16px or larger

3. **Maintain contrast** - Ensure sufficient color contrast between text and background

4. **Use appropriate line height** - 1.4-1.6 for body text improves readability

5. **Limit line length** - Keep lines to 50-75 characters for optimal readability

## Related Components

- [Heading](heading.md) - For section titles
- [Paragraph](paragraph.md) - For body text
- [Inline Text](inline-text.md) - For inline text styling
- [Link](link.md) - For clickable text
