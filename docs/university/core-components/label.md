---
description: Add accessible labels to form inputs in Webstudio.
---

# Label

> See [MDN: \<label\>](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/label)

The **Label** component creates an HTML `<label>` element that provides an accessible name for form controls.

## Overview

Labels are essential for form accessibility. They tell users what information to enter and allow clicking the label to focus its associated input.

## Properties

| Property | Type   | Description                       |
| -------- | ------ | --------------------------------- |
| `for`    | string | ID of the associated form control |
| `id`     | string | Unique identifier                 |
| `class`  | string | CSS class names                   |

## Associating Labels with Inputs

### Method 1: Using `for` Attribute

Match the label's `for` attribute to the input's `id`:

```
Label (for: email)
  └── "Email Address"
Input (id: email, name: email, type: email)
```

### Method 2: Wrapping

Place the form control inside the label:

```
Label
  ├── "Email Address"
  └── Input (name: email, type: email)
```

## Benefits of Labels

1. **Accessibility**: Screen readers announce the label when the input is focused
2. **Usability**: Clicking the label focuses the associated input
3. **Touch targets**: Increases the clickable area on mobile devices

## Styling Labels

### Typography

- **Font Weight**: Slightly bolder than body text
- **Font Size**: Same or slightly smaller than inputs
- **Color**: High contrast for readability

### Layout

- **Position**: Above input (most common) or beside it
- **Spacing**: Add margin between label and input
- **Alignment**: Align with input edges

### Required Field Indicators

Show required fields with visual indicators:

```
Label (for: email)
  ├── "Email Address"
  └── Span (class: required, color: red)
      └── "*"
```

## Form Layout Patterns

### Stacked Labels (Most Common)

```
Box
├── Label → "Name"
├── Input
├── Label → "Email"
├── Input
└── Button
```

### Inline Labels

```
Box (display: flex, align-items: center)
├── Label (width: 100px) → "Name"
└── Input (flex: 1)
```

### Floating Labels

Create floating label effect with CSS positioning:

1. Position label absolutely over input
2. On input focus/filled, translate label up
3. Reduce font size when floating

## Checkbox and Radio Labels

For checkboxes and radio buttons, wrap or associate labels:

```
Label (display: flex, align-items: center, gap: 8px)
├── Checkbox (or RadioButton)
└── "Accept terms and conditions"
```

This makes the entire label clickable.

## Best Practices

1. **Always use labels**: Every form control needs a label
2. **Be descriptive**: Clearly describe expected input
3. **Keep it concise**: Short, clear labels work best
4. **Mark required fields**: Indicate which fields are required
5. **Don't rely on placeholders**: Placeholders disappear, labels don't

## Error Messages

Associate error messages with the field:

```
Label (for: email) → "Email"
Input (id: email)
Text (role: alert) → "Please enter a valid email"
```

## Accessibility Tips

- Use proper label associations
- Include required field indicators in label text for screen readers
- Group related fields with fieldset and legend
- Ensure sufficient color contrast

## Related Components

- [Input](input.md) - Text input fields
- [Textarea](textarea.md) - Multi-line text input
- [Checkbox](checkbox.md) - Checkbox input
- [RadioButton](radio-button.md) - Radio button input
- [Form](form.md) - Form container
