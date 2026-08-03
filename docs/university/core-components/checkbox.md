---
description: Add checkbox inputs to forms in Webstudio.
---

# Checkbox

> See [MDN: \<input type="checkbox"\>](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/checkbox)

The **Checkbox** component creates an HTML checkbox input for boolean selections.

## Overview

Checkboxes allow users to select one or more options from a set, or toggle a single option on/off.

## Properties

| Property   | Type    | Description                     |
| ---------- | ------- | ------------------------------- |
| `name`     | string  | Form field name                 |
| `value`    | string  | Value submitted when checked    |
| `checked`  | boolean | Whether the checkbox is checked |
| `required` | boolean | Whether selection is required   |
| `disabled` | boolean | Whether input is disabled       |
| `id`       | string  | Unique identifier               |
| `class`    | string  | CSS class names                 |

## Basic Usage

### Single Checkbox

For a single yes/no option:

```
Label (display: flex, align-items: center, gap: 8px)
├── Checkbox (name: newsletter, value: yes)
└── "Subscribe to newsletter"
```

### Checkbox Group

For multiple selections:

```
Box
├── Label
│   ├── Checkbox (name: interests, value: design)
│   └── "Design"
├── Label
│   ├── Checkbox (name: interests, value: development)
│   └── "Development"
└── Label
    ├── Checkbox (name: interests, value: marketing)
    └── "Marketing"
```

When submitted, all checked values are sent with the same `name`.

## Styling Checkboxes

### Native Styling

Browser checkboxes can be styled with:

- `accent-color`: Change the checked color
- `width`/`height`: Adjust size
- `cursor: pointer`: Show clickable cursor

### Custom Checkbox

For fully custom checkboxes, consider using the [Radix Checkbox](../radix/checkbox.md) component, which provides complete styling control while maintaining accessibility.

## Form Submission

### Single Checkbox

If checked, sends: `name=value`
If unchecked, nothing is sent

### Multiple Checkboxes (same name)

Sends all checked values: `interests=design&interests=development`

## Validation

### Required Checkbox

For required checkboxes (like terms acceptance):

```
Label
├── Checkbox (name: terms, required: true)
└── "I agree to the terms and conditions"
```

The form won't submit until the checkbox is checked.

## Accessibility

1. **Always use labels**: Associate every checkbox with a label
2. **Group related checkboxes**: Use fieldset and legend for groups
3. **Provide clear labels**: Make options self-explanatory
4. **Keyboard support**: Ensure checkboxes work with Space key

### Grouping with Fieldset

```
Box (role: group)
├── Text (role: legend) → "Notification Preferences"
├── Label
│   ├── Checkbox (name: notify, value: email)
│   └── "Email notifications"
└── Label
    ├── Checkbox (name: notify, value: sms)
    └── "SMS notifications"
```

## States

Style different checkbox states:

| State         | Description                         |
| ------------- | ----------------------------------- |
| Unchecked     | Default empty state                 |
| Checked       | Selected state                      |
| Disabled      | Cannot be interacted with           |
| Focus         | Keyboard focus visible              |
| Indeterminate | Partial selection (JavaScript only) |

## Best Practices

1. **Use for multiple selections**: Use checkboxes when users can select multiple options
2. **Label clickable**: Make entire label area clickable
3. **Vertical alignment**: Stack checkboxes vertically for easier scanning
4. **Reasonable defaults**: Pre-check options when appropriate
5. **Clear labeling**: Use positive phrasing (what happens when checked)

## When to Use

| Use Checkbox        | Use Radio                  | Use Toggle       |
| ------------------- | -------------------------- | ---------------- |
| Multiple selections | Single selection from many | On/off setting   |
| Optional agreements | Required choice            | Immediate effect |
| Filter options      | Exclusive options          | Settings         |

## Related Components

- [RadioButton](radio-button.md) - Single selection from multiple options
- [Switch](../radix/switch.md) - Toggle on/off (Radix)
- [Radix Checkbox](../radix/checkbox.md) - Fully customizable checkbox
- [Label](label.md) - Associated labels
- [Form](form.md) - Form container
