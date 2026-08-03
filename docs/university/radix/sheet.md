---
description: Build slide-out panels and drawers with Radix UI in Webstudio.
---

# Sheet

> Based on [Radix Dialog](https://www.radix-ui.com/primitives/docs/components/dialog)

The Sheet component displays content in a panel that slides in from the edge of the screen. It's an extension of the Dialog component, commonly used for mobile navigation menus, sidebars, and slide-out panels.

## When to Use

Use Sheet for:

- Mobile navigation menus
- Settings panels
- Shopping carts
- Filters and search panels
- Any content that slides in from the side

## Structure

Sheet uses the same structure as [Dialog](dialog.md):

| Component              | Description                                   |
| ---------------------- | --------------------------------------------- |
| **Dialog**             | The root component (Sheet is a styled Dialog) |
| **Dialog Trigger**     | The button that opens the sheet               |
| **Dialog Overlay**     | The backdrop behind the sheet                 |
| **Dialog Content**     | The sliding panel                             |
| **Dialog Title**       | Heading (required for accessibility)          |
| **Dialog Description** | Optional description                          |
| **Dialog Close**       | Button to close the sheet                     |

## How to Use

1. Drag a **Sheet** component from Components > Radix onto your canvas
2. The component comes pre-configured to slide from the right
3. Customize the trigger (often a hamburger menu icon)
4. Add your content inside Dialog Content
5. Style the panel width and slide direction

## Creating Different Slide Directions

Sheet can slide from any edge. Style the Dialog Content:

### Right (Default)

```css
position: fixed;
right: 0;
top: 0;
height: 100%;
width: 300px;
```

### Left

```css
position: fixed;
left: 0;
top: 0;
height: 100%;
width: 300px;
```

### Bottom

```css
position: fixed;
bottom: 0;
left: 0;
width: 100%;
height: auto;
```

### Top

```css
position: fixed;
top: 0;
left: 0;
width: 100%;
height: auto;
```

## Properties

Some commonly used properties (see the Settings panel for all available options):

| Property | Description                           |
| -------- | ------------------------------------- |
| **open** | Controls whether the sheet is visible |

## Mobile Navigation Pattern

A common pattern for responsive navigation:

1. Add a Sheet with a hamburger menu trigger
2. Show the trigger only on mobile breakpoints
3. Add your navigation links inside the sheet
4. Hide the regular navigation on mobile

## Related

- [Dialog](./dialog.md) – Modal window that overlays the page
- [Popover](./popover.md) – Floating panel for interactive content
- [Collapsible](./collapsible.md) – Expandable content panel
- [Navigation Menu](./navigation-menu.md) – Accessible navigation component
