---
description: Add dropdown select inputs to forms in Webstudio.
---

# Select (Native)

> See [MDN: \<select\>](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/select)

The native **Select** component creates an HTML `<select>` dropdown for choosing one option from a list.

## Overview

The native Select component uses the browser's built-in dropdown functionality. For a fully customizable dropdown with complete styling control, see the [Radix Select](../radix/select.md) component.

## Components

### Select

The dropdown container.

| Property   | Type    | Description                   |
| ---------- | ------- | ----------------------------- |
| `name`     | string  | Form field name               |
| `value`    | string  | Currently selected value      |
| `required` | boolean | Whether selection is required |
| `disabled` | boolean | Whether select is disabled    |
| `multiple` | boolean | Allow multiple selections     |
| `id`       | string  | Unique identifier             |
| `class`    | string  | CSS class names               |

### Option

Individual options within the select.

| Property   | Type    | Description                           |
| ---------- | ------- | ------------------------------------- |
| `value`    | string  | Value submitted when selected         |
| `selected` | boolean | Whether this option is selected       |
| `disabled` | boolean | Whether option is disabled            |
| `label`    | string  | Display text (alternative to content) |

## Basic Usage

```
Label (for: country)
  └── "Country"
Select (id: country, name: country)
├── Option (value: "") → "Select a country..."
├── Option (value: us) → "United States"
├── Option (value: uk) → "United Kingdom"
├── Option (value: ca) → "Canada"
└── Option (value: au) → "Australia"
```

## Placeholder Option

Create a placeholder with an empty first option:

```
Option (value: "", disabled: true, selected: true)
  └── "Please select..."
```

This shows hint text but can't be submitted.

## Form Submission

When submitted, the selected option's `value` is sent:

```
country=us
```

## Styling Limitations

Native select elements have limited styling options:

- **Can style**: border, background, padding, font
- **Cannot style**: dropdown arrow, option appearance (varies by browser/OS)

For full styling control, use the [Radix Select](../radix/select.md) component.

### Basic Styling

```css
/* What you can customize */
Select {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 8px 12px;
  background: white;
  font-size: 16px;
}
```

## Multiple Selection

For selecting multiple options:

```
Select (name: languages, multiple: true)
├── Option (value: en) → "English"
├── Option (value: es) → "Spanish"
├── Option (value: fr) → "French"
└── Option (value: de) → "German"
```

Users can Ctrl/Cmd+click to select multiple options.

## Accessibility

1. **Use labels**: Always associate with a label
2. **Include placeholder**: Help users understand what to select
3. **Keyboard support**: Native select works with keyboard
4. **Avoid disabled options**: Can be confusing for screen readers

## Best Practices

1. **Use for 5+ options**: Use radio buttons for fewer options
2. **Alphabetize long lists**: Or use logical ordering
3. **Include placeholder**: Show default unselected state
4. **Keep options concise**: Long text truncates
5. **Group related options**: Use optgroup for categories (via HTML Embed if needed)

## When to Use Native vs Radix Select

| Native Select             | Radix Select          |
| ------------------------- | --------------------- |
| Simple forms              | Custom styling needed |
| Mobile-friendly           | Desktop-focused       |
| Quick implementation      | Searchable options    |
| Standard browser behavior | Complex interactions  |
| Works everywhere          | Advanced features     |

## Dynamic Options

Populate options from data:

```
Select (name: category)
└── Collection (data: categories)
    └── Option (value: category.id)
        └── {category.name}
```

## Related Components

- [Radix Select](../radix/select.md) - Fully customizable select
- [Radio Button](radio-button.md) - For fewer options
- [Label](label.md) - Associated labels
- [Form](form.md) - Form container
