---
description: Add multi-line text input fields to forms in Webstudio.
---

# Textarea

> See [MDN: \<textarea\>](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/textarea)

The **Textarea** component creates a multi-line text input field for collecting longer text content.

## Overview

Textarea is used when you need users to enter multiple lines of text, such as messages, descriptions, comments, or any long-form content.

## Properties

| Property      | Type    | Description                    |
| ------------- | ------- | ------------------------------ |
| `name`        | string  | Form field name                |
| `placeholder` | string  | Hint text shown when empty     |
| `value`       | string  | Current content                |
| `required`    | boolean | Whether the field is required  |
| `disabled`    | boolean | Whether input is disabled      |
| `readonly`    | boolean | Whether input is read-only     |
| `rows`        | number  | Visible number of lines        |
| `cols`        | number  | Visible width in characters    |
| `maxlength`   | number  | Maximum character limit        |
| `minlength`   | number  | Minimum character limit        |
| `wrap`        | string  | Text wrapping mode (soft/hard) |
| `id`          | string  | Unique identifier              |
| `class`       | string  | CSS class names                |

## Basic Usage

```
Form
├── Label (for: message)
├── Textarea (id: message, name: message, rows: 5)
└── Button (type: submit)
```

## Sizing

### Fixed Size

Set `rows` and `cols` attributes for fixed dimensions:

- `rows`: Number of visible text lines
- `cols`: Width in average character widths

### CSS Sizing

For responsive sizing, use CSS:

- `width`: Control width (e.g., `100%`)
- `height`: Control height
- `min-height`/`max-height`: Set boundaries

### Resizable Behavior

By default, textareas can be resized by users. Control this with CSS:

- `resize: none` - Not resizable
- `resize: vertical` - Only vertical resizing
- `resize: horizontal` - Only horizontal resizing
- `resize: both` - Both directions (default)

## Character Limits

### Maximum Length

```
Textarea (maxlength: 500)
```

### Show Character Count

Use a Text component with an expression to show remaining characters:

```
Remaining: {500 - textareaValue.length}
```

## Styling

### Common Styles

- **Border**: Match your design system's input styles
- **Padding**: `12px` for comfortable text entry
- **Font**: Use the same font as your text inputs
- **Line Height**: 1.5 for readability

### State Styles

| State    | Style Suggestion                  |
| -------- | --------------------------------- |
| Default  | Subtle border, light background   |
| Focus    | Highlighted border or ring        |
| Disabled | Muted colors, cursor: not-allowed |
| Invalid  | Red border, error colors          |

## Best Practices

1. **Use labels**: Always associate with a label
2. **Set appropriate rows**: Show enough lines for expected content
3. **Provide size hints**: Let users know expected length
4. **Consider auto-resize**: Use JavaScript for auto-growing textareas
5. **Match input styles**: Keep consistent with other form fields
6. **Add character count**: For limited fields, show remaining characters

## When to Use

| Use Textarea           | Use Input          |
| ---------------------- | ------------------ |
| Comments/messages      | Single-line fields |
| Descriptions           | Names, emails      |
| Bio/about sections     | Phone numbers      |
| Addresses (multi-line) | Short inputs       |
| Notes                  | Passwords          |

## Related Components

- [Input](input.md) - Single-line text input
- [Form](form.md) - Form container
- [Label](label.md) - Input labels
