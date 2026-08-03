---
description: Add radio button inputs for single-choice selections in Webstudio forms.
---

# Radio Button

> See [MDN: \<input type="radio"\>](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/radio)

The **Radio Button** component creates an HTML radio input for selecting one option from a group.

## Overview

Radio buttons are used when users must select exactly one option from a predefined set. Unlike checkboxes, selecting one radio button in a group automatically deselects any previously selected option.

## Properties

| Property   | Type    | Description                       |
| ---------- | ------- | --------------------------------- |
| `name`     | string  | Group name (same for all options) |
| `value`    | string  | Value submitted when selected     |
| `checked`  | boolean | Whether this option is selected   |
| `required` | boolean | Whether a selection is required   |
| `disabled` | boolean | Whether input is disabled         |
| `id`       | string  | Unique identifier                 |
| `class`    | string  | CSS class names                   |

## Basic Usage

### Radio Group

Radio buttons with the same `name` form a group:

```
Box (role: radiogroup)
├── Label
│   ├── RadioButton (name: plan, value: free)
│   └── "Free Plan"
├── Label
│   ├── RadioButton (name: plan, value: pro)
│   └── "Pro Plan"
└── Label
    ├── RadioButton (name: plan, value: enterprise)
    └── "Enterprise Plan"
```

Only one option can be selected at a time.

## Important Rules

1. **Same name**: All radio buttons in a group must share the same `name`
2. **Unique values**: Each option needs a unique `value`
3. **At least one label**: Each radio button needs an associated label

## Styling Radio Buttons

### Native Styling

Basic styling options:

- `accent-color`: Change the selected color
- `width`/`height`: Adjust size
- `cursor: pointer`: Show clickable cursor

### Custom Radio Buttons

For fully custom styling, consider using the [Radix Radio Group](../radix/radio-group.md) component, which provides complete design control.

## Form Submission

When the form is submitted, the selected option's value is sent:

```
plan=pro
```

If nothing is selected and the field is required, the form won't submit.

## Default Selection

To pre-select an option, set `checked: true`:

```
RadioButton (name: plan, value: pro, checked: true)
```

Consider pre-selecting the most common choice.

## Accessibility

### Grouping

Properly group radio buttons:

```
Box (role: radiogroup, aria-label: "Subscription Plan")
├── Label → RadioButton + "Option 1"
├── Label → RadioButton + "Option 2"
└── Label → RadioButton + "Option 3"
```

### Keyboard Navigation

Radio groups support keyboard navigation:

- **Arrow keys**: Move between options
- **Space**: Select focused option
- **Tab**: Move to/from the group

## Layout Patterns

### Vertical Stack (Recommended)

```
Box (display: flex, flex-direction: column, gap: 8px)
├── Label (display: flex, gap: 8px)
│   ├── RadioButton
│   └── "Option 1"
```

### Horizontal Row

```
Box (display: flex, gap: 16px)
├── Label
│   ├── RadioButton
│   └── "Yes"
└── Label
    ├── RadioButton
    └── "No"
```

### Card Selection

```
Label (padding: 16px, border: 1px solid, border-radius: 8px)
├── Box (display: flex, gap: 12px)
│   ├── RadioButton
│   └── Box
│       ├── Text (bold) → "Plan Name"
│       └── Text → "Description"
```

## States

| State     | Description               |
| --------- | ------------------------- |
| Unchecked | Default unselected state  |
| Checked   | Selected state            |
| Disabled  | Cannot be interacted with |
| Focus     | Keyboard focus visible    |

## Best Practices

1. **Use for mutually exclusive choices**: Only when one option must be selected
2. **Vertical layout**: Easier to scan than horizontal
3. **Logical order**: Most common or recommended first
4. **Clear labels**: Self-explanatory option text
5. **Default selection**: Pre-select when there's a logical default
6. **5-7 options max**: Use select dropdown for more options

## When to Use

| Use Radio Buttons              | Use Checkbox                | Use Select        |
| ------------------------------ | --------------------------- | ----------------- |
| 2-7 mutually exclusive options | Multiple selections allowed | Many options (8+) |
| All options visible            | Toggle single option        | Space constrained |
| User needs to compare          | Independent choices         | Long option text  |

## Related Components

- [Checkbox](checkbox.md) - Multiple selections
- [Select](select.md) - Dropdown single selection
- [Radix Radio Group](../radix/radio-group.md) - Customizable radio buttons
- [Label](label.md) - Associated labels
- [Form](form.md) - Form container
