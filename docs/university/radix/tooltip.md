---
description: Add informational tooltips with Radix UI in Webstudio.
---

# Tooltip

> Based on [Radix Tooltip](https://www.radix-ui.com/primitives/docs/components/tooltip)

The Tooltip component displays informational text when a user hovers over or focuses on an element. Tooltips provide helpful hints without cluttering the interface.

## When to Use

Use Tooltip for:

- Explaining icon-only buttons
- Providing additional context for form fields
- Showing keyboard shortcuts
- Displaying truncated text in full
- Any brief, non-interactive hint

## Structure

The Tooltip component consists of:

| Component           | Description                                       |
| ------------------- | ------------------------------------------------- |
| **Tooltip**         | The root component that manages show/hide state   |
| **Tooltip Trigger** | The element that shows the tooltip on hover/focus |
| **Tooltip Content** | The floating text that appears                    |

## How to Use

1. Drag a **Tooltip** component from Components > Radix onto your canvas
2. Place your trigger element (like a button) inside Tooltip Trigger
3. Edit the text inside Tooltip Content
4. Style the tooltip content to match your design

## Properties

Some commonly used properties (see the Settings panel for all available options):

### Tooltip

| Property                    | Description                                                  |
| --------------------------- | ------------------------------------------------------------ |
| **open**                    | Force the tooltip open for styling on the canvas             |
| **delayDuration**           | Delay in milliseconds before showing (default: 700ms)        |
| **disableHoverableContent** | Prevents tooltip from staying open when hovering its content |

### Tooltip Content

| Property        | Description                                         |
| --------------- | --------------------------------------------------- |
| **side**        | Preferred side: `top`, `right`, `bottom`, or `left` |
| **sideOffset**  | Distance in pixels from the trigger (default: 4px)  |
| **align**       | Alignment: `start`, `center`, or `end`              |
| **alignOffset** | Offset from the alignment position                  |

## Related

- [Popover](./popover.md) – Interactive floating content panel
- [Dialog](./dialog.md) – Modal window for focused content
- [Label](./label.md) – Accessible labels for form controls
