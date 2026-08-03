---
description: Create floating popover elements with Radix UI in Webstudio.
---

# Popover

> Based on [Radix Popover](https://www.radix-ui.com/primitives/docs/components/popover)

The Popover component displays rich content in a floating panel that appears next to a trigger element. Unlike tooltips, popovers can contain interactive content like forms, buttons, and links.

## When to Use

Use Popover for:

- User profile dropdowns
- Quick edit forms
- Additional options or settings
- Preview cards
- Any interactive floating content

## Structure

The Popover component consists of several parts:

| Component           | Description                                      |
| ------------------- | ------------------------------------------------ |
| **Popover**         | The root component that manages open/close state |
| **Popover Trigger** | The element that opens the popover when clicked  |
| **Popover Content** | The floating panel containing your content       |
| **Popover Close**   | Optional button to close the popover             |

## How to Use

1. Drag a **Popover** component from Components > Radix onto your canvas
2. Customize the trigger (usually a button)
3. Add your content inside the Popover Content
4. Optionally add a Close button using Popover Close
5. Style the content panel and adjust positioning

## Properties

Some commonly used properties (see the Settings panel for all available options):

### Popover

| Property | Description                                                            |
| -------- | ---------------------------------------------------------------------- |
| **open** | Controls whether the popover is visible. Use for styling on the canvas |

### Popover Content

| Property        | Description                                         |
| --------------- | --------------------------------------------------- |
| **side**        | Preferred side: `top`, `right`, `bottom`, or `left` |
| **sideOffset**  | Distance in pixels from the trigger                 |
| **align**       | Alignment: `start`, `center`, or `end`              |
| **alignOffset** | Offset from the alignment position                  |

## Related

- [Tooltip](./tooltip.md) – Non-interactive hints that appear on hover
- [Dialog](./dialog.md) – Modal window for focused content
- [Sheet](./sheet.md) – Sliding panel from screen edge
- [Select](./select.md) – Dropdown selection component
