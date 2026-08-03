---
description: Add clickable buttons to your Webstudio site with the Button component.
---

# 🔘 Button

> See [MDN: \<button\>](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button)

The Button component creates clickable buttons for user interactions. Buttons trigger actions like submitting forms, opening dialogs, or navigating when combined with other components.

## When to Use

Use Button for:

- Form submissions
- Triggering actions (open dialog, toggle, etc.)
- Call-to-action elements
- Interactive controls

{% hint style="warning" %}
Buttons are for actions, not navigation. For navigation links, use the [Link](link.md) component instead. If you need a link styled as a button, style the Link component accordingly.
{% endhint %}

## How to Use

1. Drag a **Button** component from Components > Forms onto your canvas
2. Edit the button text
3. Style using the Style Panel
4. Place inside a Form for submissions, or use HTML Embed scripts for custom interactivity

## Properties

Some commonly used properties (see the Settings panel for all available options):

| Property     | Description                                                                 |
| ------------ | --------------------------------------------------------------------------- |
| **type**     | `submit` (form submission), `reset` (clear form), or `button` (general use) |
| **disabled** | Prevents interaction when true                                              |
| **name**     | Name for form submission                                                    |
| **value**    | Value for form submission                                                   |

## Button Types

### Submit Button

Submits the parent form when clicked. Use inside [Form](form.md) or [Webhook Form](webhook-form.md).

### Reset Button

Clears all form fields to their default values.

### Button (Default)

General purpose button for non-form actions. Use with component interactions like opening dialogs.

## Styling States

Some common states (you can also create custom states):

- **Default** - Normal appearance
- **Hover** (`:hover`) - Mouse is over the button
- **Focus** (`:focus-visible`) - Keyboard focused
- **Active** (`:active`) - Being pressed
- **Disabled** (`:disabled`) - Cannot be clicked

## Related

- [Form](form.md) – Form containers for submissions
- [Link](link.md) – Navigation links
- [Input](input.md) – Text input fields
