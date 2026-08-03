---
description: Add accessible radio button groups with Radix UI in Webstudio.
---

# Radio Group

> Based on [Radix Radio Group](https://www.radix-ui.com/primitives/docs/components/radio-group)

The Radio Group component allows users to select a single option from a list of choices. Unlike checkboxes, only one radio button in a group can be selected at a time.

## When to Use

Use Radio Group for:

- Selecting one option from a small set (2-5 options)
- Payment method selection
- Shipping options
- Any mutually exclusive choice

## Structure

The Radio Group component consists of:

| Component                 | Description                              |
| ------------------------- | ---------------------------------------- |
| **Radio Group**           | The container managing selection state   |
| **Radio Group Item**      | An individual radio button               |
| **Radio Group Indicator** | The visual indicator (dot) when selected |

## How to Use

1. Drag a **Radio Group** component from Components > Radix onto your canvas
2. The component comes with sample radio items
3. Add or remove Radio Group Items as needed
4. Set a unique `value` on each Radio Group Item
5. Add labels next to each item for clarity
6. Style the items and indicators

## Using with Labels

For proper accessibility, wrap each radio in a [Label](label.md):

```
Label
├── Radio Group Item
│   └── Radio Group Indicator
└── Text "Option Name"
```

Or connect via `id` and `htmlFor` attributes.

## Using with Collections

To generate radio options dynamically:

1. Add a [Collection](../core-components/collection.md) inside the Radio Group
2. Add a Label containing a Radio Group Item
3. Bind the `value` property to a unique identifier
4. Bind the label text to your option's name

## Properties

Some commonly used properties (see the Settings panel for all available options):

### Radio Group

| Property     | Description                    |
| ------------ | ------------------------------ |
| **id**       | Unique identifier              |
| **name**     | Form field name for submission |
| **value**    | The currently selected value   |
| **required** | Whether selection is required  |

### Radio Group Item

| Property  | Description                                  |
| --------- | -------------------------------------------- |
| **value** | Unique identifier for this option (required) |

## Styling States

Some common states (you can also create custom states):

- **Checked** (`[data-state=checked]`) - Item is selected
- **Unchecked** (`[data-state=unchecked]`) - Item is not selected
- **Disabled** (`:disabled`) - Item cannot be selected
- **Focus** (`:focus-visible`) - Item has keyboard focus

## Related

- [Select](./select.md) – Dropdown selection for choosing from a list of options
- [Switch](./switch.md) – Toggle control for binary on/off choices
- [Label](./label.md) – Accessible labels for form controls
- [Form](../core-components/form.md) – Container for form elements and submission handling
- [Collection](../core-components/collection.md) – Generate radio options dynamically from data
