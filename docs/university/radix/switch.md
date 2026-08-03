---
description: Add toggle switches with Radix UI in Webstudio.
---

# Switch

> Based on [Radix Switch](https://www.radix-ui.com/primitives/docs/components/switch)

The Switch component is a toggle control that allows users to turn an option on or off. It's similar to a checkbox but provides a more visual representation of the binary state.

## When to Use

Use Switch for:

- Settings that take effect immediately
- Enabling/disabling features
- Dark mode toggles
- Notification preferences
- Any on/off binary choice

## Structure

The Switch component consists of:

| Component        | Description                       |
| ---------------- | --------------------------------- |
| **Switch**       | The track/background element      |
| **Switch Thumb** | The circular indicator that moves |

## How to Use

1. Drag a **Switch** component from Components > Radix onto your canvas
2. The component comes with the track and thumb pre-configured
3. Style the track for both checked and unchecked states
4. Style the thumb position and appearance
5. Connect to form or add interactions as needed

## Properties

Some commonly used properties (see the Settings panel for all available options):

| Property     | Description                                        |
| ------------ | -------------------------------------------------- |
| **id**       | Unique identifier, useful for connecting to labels |
| **name**     | Form field name for submission                     |
| **value**    | The value submitted with forms when checked        |
| **checked**  | Whether the switch is on                           |
| **required** | Whether toggling on is required                    |

## Styling States

Some common states (you can also create custom states):

- **Checked** (`[data-state=checked]`) - Switch is on
- **Unchecked** (`[data-state=unchecked]`) - Switch is off
- **Disabled** (`:disabled`) - Switch cannot be interacted with
- **Focus** (`:focus-visible`) - Switch has keyboard focus

## Related

- [Radio Group](./radio-group.md) – Selection from multiple options
- [Select](./select.md) – Dropdown selection component
- [Label](./label.md) – Accessible labels for form controls
- [Form](../core-components/form.md) – Container for form elements and submission handling
