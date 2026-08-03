---
description: Add text input fields to forms in Webstudio.
---

# Input

> See [MDN: \<input\>](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input)

The **Input** component creates an HTML `<input>` element for collecting user data in forms.

## Overview

Input is a fundamental form control used to collect various types of user data including text, numbers, emails, passwords, and more.

## Properties

| Property       | Type    | Description                                      |
| -------------- | ------- | ------------------------------------------------ |
| `type`         | string  | Input type (text, email, password, number, etc.) |
| `name`         | string  | Form field name (used in form submission)        |
| `placeholder`  | string  | Hint text shown when empty                       |
| `value`        | string  | Current input value                              |
| `required`     | boolean | Whether the field is required                    |
| `disabled`     | boolean | Whether the input is disabled                    |
| `readonly`     | boolean | Whether the input is read-only                   |
| `autocomplete` | string  | Browser autocomplete behavior                    |
| `id`           | string  | Unique identifier                                |
| `class`        | string  | CSS class names                                  |

## Input Types

| Type             | Use Case                          |
| ---------------- | --------------------------------- |
| `text`           | General text input (default)      |
| `email`          | Email addresses (with validation) |
| `password`       | Hidden text entry                 |
| `number`         | Numeric values                    |
| `tel`            | Phone numbers                     |
| `url`            | Website URLs                      |
| `search`         | Search queries                    |
| `date`           | Date picker                       |
| `time`           | Time picker                       |
| `datetime-local` | Date and time                     |
| `file`           | File uploads                      |
| `hidden`         | Hidden form data                  |

## Form Usage

Inputs should be placed within a [Form](form.md) or [Webhook Form](webhook-form.md):

```
Form
├── Label (for: email-input)
├── Input (id: email-input, name: email, type: email)
├── Label (for: password-input)
├── Input (id: password-input, name: password, type: password)
└── Button (type: submit)
```

## Associating Labels

Always associate inputs with labels for accessibility:

### Method 1: Matching IDs

1. Set `id` on the Input (e.g., "email")
2. Set `for` on the Label (e.g., "email")

### Method 2: Wrapping

Place the Input inside a Label component.

## Validation

### Built-in Validation

HTML5 provides built-in validation for certain input types:

- `email` validates email format
- `url` validates URL format
- `number` validates numeric input

### Required Fields

Set `required: true` to make a field mandatory.

### Pattern Matching

Use the `pattern` attribute for custom validation with regex.

## Styling States

Style different input states:

| State       | Selector        | Use                    |
| ----------- | --------------- | ---------------------- |
| Default     | -               | Normal state           |
| Focus       | `:focus`        | When input is selected |
| Hover       | `:hover`        | Mouse over             |
| Disabled    | `:disabled`     | When disabled          |
| Invalid     | `:invalid`      | Validation failed      |
| Valid       | `:valid`        | Validation passed      |
| Placeholder | `::placeholder` | Placeholder text       |

### Example Styles

- **Border**: `1px solid #ccc`, change on focus
- **Padding**: `8px 12px` for comfortable typing
- **Border Radius**: Slight rounding looks modern
- **Focus Ring**: Use outline or box-shadow for accessibility

## Best Practices

1. **Always use labels**: Every input needs an associated label
2. **Use appropriate types**: Use `email` for emails, `tel` for phones, etc.
3. **Provide placeholders wisely**: Don't use placeholder as label replacement
4. **Show validation feedback**: Indicate errors clearly
5. **Ensure touch targets**: Minimum 44x44px for mobile
6. **Support autocomplete**: Use proper `autocomplete` values

## Autocomplete Values

Common `autocomplete` values:

| Value              | Use                |
| ------------------ | ------------------ |
| `name`             | Full name          |
| `email`            | Email address      |
| `tel`              | Phone number       |
| `street-address`   | Street address     |
| `postal-code`      | ZIP/postal code    |
| `country`          | Country            |
| `cc-number`        | Credit card number |
| `current-password` | Current password   |
| `new-password`     | New password       |

## Related Components

- [Form](form.md) - Form container
- [Webhook Form](webhook-form.md) - Form with webhook submission
- [Label](label.md) - Input labels
- [Textarea](textarea.md) - Multi-line text input
- [Select](select.md) - Dropdown selection

## Related Videos

{% embed url="https://www.youtube.com/watch?v=SOd7V8A9SOw" %}
