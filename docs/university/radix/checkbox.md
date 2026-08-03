---
description: Add accessible checkbox controls with Radix UI in Webstudio.
---

# Checkbox (Radix)

> Based on [Radix Checkbox](https://www.radix-ui.com/primitives/docs/components/checkbox)

The Radix Checkbox component provides a fully customizable checkbox with complete styling control while maintaining accessibility features.

## When to Use Radix Checkbox

Use Radix Checkbox when you need:

- Custom checkbox styling beyond native browser limits
- Animated check indicators
- Complex checkbox designs (custom icons, sizes, colors)
- Indeterminate state support

For simple forms where native styling is acceptable, the [native Checkbox](../core-components/checkbox.md) component works well.

## Structure

| Component              | Description                     |
| ---------------------- | ------------------------------- |
| **Checkbox**           | The main checkbox container     |
| **Checkbox Indicator** | Contains the check mark or icon |

## How to Use

1. Drag a **Checkbox** component from Components > Radix onto your canvas
2. The component includes a pre-configured indicator
3. Add a Label and associate it with the checkbox
4. Style all states (unchecked, checked, disabled)

## Properties

### Checkbox

| Property   | Description                             |
| ---------- | --------------------------------------- |
| `id`       | Unique identifier for label association |
| `name`     | Form field name for submission          |
| `value`    | Value sent when checked                 |
| `checked`  | Control checked state                   |
| `required` | Whether checking is required            |
| `disabled` | Disable the checkbox                    |

### Checkbox Indicator

| Property     | Description                          |
| ------------ | ------------------------------------ |
| `forceMount` | Keep indicator in DOM when unchecked |

## Basic Setup

```
Label (display: flex, align-items: center, gap: 8px)
├── Checkbox
│   └── Checkbox Indicator
│       └── Check icon (SVG or text)
└── "Accept terms and conditions"
```

## Styling States

### Data Attributes

| State         | Selector                     | Description       |
| ------------- | ---------------------------- | ----------------- |
| Unchecked     | `[data-state=unchecked]`     | Default state     |
| Checked       | `[data-state=checked]`       | Selected state    |
| Indeterminate | `[data-state=indeterminate]` | Partial selection |
| Disabled      | `[data-disabled]`            | Cannot interact   |

### Example Styles

**Checkbox container:**

- Default: border, background, size
- Checked: different background/border
- Focus: visible ring for accessibility

**Indicator:**

- Hidden when unchecked (opacity: 0 or display: none)
- Visible when checked (opacity: 1)
- Animate with transitions

## Indeterminate State

The indeterminate state is useful for "select all" checkboxes:

```
Checkbox (checked: "indeterminate")
└── Checkbox Indicator
    └── Minus icon (instead of check)
```

This indicates partial selection of child items.

## Custom Check Icons

Replace the default indicator content:

1. Add an SVG or icon component inside Checkbox Indicator
2. Style the icon size and color
3. Animate on check/uncheck

## Animation Tips

Add smooth check animations:

```css
/* Indicator transition */
Checkbox Indicator {
  transition:
    opacity 200ms,
    transform 200ms;
}

/* Scale animation on check */
[data-state="checked"] Checkbox Indicator {
  transform: scale(1);
}

[data-state="unchecked"] Checkbox Indicator {
  transform: scale(0);
  opacity: 0;
}
```

## Accessibility

Radix Checkbox provides:

- Full keyboard support (Space to toggle)
- ARIA attributes automatically applied
- Focus management
- Screen reader announcements

Ensure you:

- Always provide a visible label
- Maintain sufficient color contrast
- Include focus indicators

## Form Integration

Radix Checkbox works with Webstudio forms:

```
Form
├── Label
│   ├── Checkbox (name: newsletter)
│   │   └── Checkbox Indicator → ✓
│   └── "Subscribe to newsletter"
└── Button (type: submit)
```

The checkbox value is submitted with the form when checked.

## Comparison

| Feature       | Native Checkbox   | Radix Checkbox |
| ------------- | ----------------- | -------------- |
| Styling       | Limited           | Full control   |
| Custom icons  | No                | Yes            |
| Animations    | No                | Yes            |
| Indeterminate | JavaScript only   | Built-in       |
| Accessibility | Browser default   | WAI-ARIA       |
| Size          | 13-16px typically | Any size       |

## Related Components

- [Native Checkbox](../core-components/checkbox.md) - Simple HTML checkbox
- [Switch](switch.md) - Toggle on/off control
- [Radio Group](radio-group.md) - Single selection
