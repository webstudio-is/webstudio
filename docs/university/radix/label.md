---
description: Add accessible form labels with Radix UI in Webstudio.
---

# Label (Radix)

> Based on [Radix Label](https://www.radix-ui.com/primitives/docs/components/label)

The Radix Label component provides an accessible label for form controls with built-in association handling.

## Overview

While the native HTML `<label>` element works for most cases, the Radix Label provides:

- Automatic ID generation and association
- Better focus behavior
- Consistent cross-browser behavior
- Integration with other Radix components

## When to Use

Use Radix Label when:

- Working with other Radix form components (Checkbox, Switch, Radio Group)
- You need consistent styling across all form labels
- Building custom form controls

For native HTML form elements, the [native Label](../core-components/label.md) component works well.

## Properties

| Property | Description                       |
| -------- | --------------------------------- |
| `for`    | ID of the associated form control |
| `id`     | Unique identifier                 |

## Basic Usage

### With Radix Checkbox

```
Label
├── Radix Checkbox
│   └── Checkbox Indicator → ✓
└── "Enable notifications"
```

When the label wraps the control, clicking anywhere on the label toggles the checkbox.

### With Explicit Association

```
Label (for: email-input)
  └── "Email Address"
Input (id: email-input)
```

## Styling

Style the Label like any text element:

- Font size and weight
- Color and spacing
- Cursor (pointer for clickable areas)

## Best Practices

1. **Always label form controls**: Every input needs a label
2. **Keep labels visible**: Don't rely only on placeholders
3. **Be concise**: Clear, short label text
4. **Position consistently**: Above or beside controls

## Related Components

- [Native Label](../core-components/label.md) - HTML label element
- [Checkbox](checkbox.md) - Radix checkbox
- [Switch](switch.md) - Toggle switch
- [Radio Group](radio-group.md) - Radio buttons
