---
description: >-
  Learn how to build a responsive navigation menu with desktop links and a mobile hamburger menu using Webstudio.
---

# How to Create a Responsive Navigation Menu

This guide walks you through creating a navigation menu that displays horizontal links on desktop and a hamburger menu (slide-out drawer) on mobile.

{% embed url="https://www.youtube.com/watch?v=81whpqLzuPw" %}

## Overview

The final navigation will include:

- **Desktop**: Logo + horizontal navigation links
- **Mobile**: Logo + hamburger icon that opens a slide-out menu
- **Synced content**: Using Slots to keep menu items in sync between both views

## Building the Desktop Menu

### 1. Create the Menu Structure

1. Add a **Box** component and name it "Menu" in the Navigator
2. Inside Menu, add another Box named "Menu Wrapper"
3. Set Menu Wrapper to `display: flex` with `justify-content: space-between`
4. Set a `max-width` (e.g., 1200px) and `margin: 0 auto` for centering

### 2. Add the Logo

1. Inside Menu Wrapper, add a **Link** component
2. Inside the Link, add an **Image** component for your logo
3. Set the Link's href to `/` (home page)
4. Style the image (e.g., `height: 40px`, `width: auto`)

### 3. Add Navigation Links

1. Add a Box named "Desktop Links" next to the logo Link
2. Set it to `display: flex` with `gap` for spacing
3. Add **Link** components for each menu item
4. Create a Token for link styling (color, font, hover effects)

### 4. Style Hover Effects

1. Select a navigation link
2. Create a Token named "nav-link"
3. Add styles: color, text-decoration
4. Switch to **Hover** state
5. Add hover styles (e.g., color change, underline)
6. Switch back to default state
7. Add `transition: color 0.2s ease`

## Building the Mobile Menu

### 1. Add the Sheet Component

The **Sheet** component (from Radix) provides a pre-built slide-out menu:

1. From Components, add a **Sheet** (under Radix)
2. The Sheet includes: Trigger, Overlay, Content, Close, Title, Description

### 2. Configure the Sheet Trigger

1. Select the **Sheet Trigger**
2. Delete the default button text
3. Add an **Icon** or SVG hamburger icon inside the Trigger
4. Style the trigger (remove default button styles if needed)

### 3. Style the Sheet Content

1. Select **Sheet Content**
2. Position it: For a right-side drawer, use the anchor property
3. Set `width` (e.g., 300px or 80vw)
4. Add background color and padding
5. Set `height: 100vh` for full-height drawer

### 4. Add Mobile Navigation Links

1. Inside Sheet Content, add a Box for mobile links
2. Set `display: flex`, `flex-direction: column`
3. Add navigation links (we'll sync these with desktop using Slots)

## Syncing Menus with Slots

Use **Slots** to maintain a single source of truth for menu items:

### 1. Create the Slot

1. Select your Desktop Links container
2. Copy it (Cmd/Ctrl + C)
3. From Components, add a **Slot** component where your mobile links should be
4. Paste the copied content into the Slot

Now both desktop and mobile menus share the same links. Edit once, update everywhere.

### 2. Adjust Slot Styling Per Location

The Slot inherits styles, but you can override them:

- Desktop: `flex-direction: row`
- Mobile (inside Sheet): `flex-direction: column`

Apply these overrides using Local styles on the parent containers, not the Slot itself.

## Making It Responsive

### Hide/Show Based on Breakpoint

1. Select "Desktop Links" container
2. On mobile breakpoint: `display: none`

3. Select the Sheet Trigger
4. On Base breakpoint: `display: none`
5. On mobile breakpoint: `display: flex`

This shows desktop links on large screens and the hamburger menu on mobile.

## Tips and Best Practices

### Auto-margin Positioning

To position the Sheet Trigger on the right:

```css
margin-left: auto;
```

This pushes it to the far right within a flex container.

### Close Menu on Link Click

For single-page sites with anchor links, you may want the menu to close when a link is clicked. This requires adding a small script or using Sheet's built-in close behavior.

### Accessibility

- The Sheet component includes proper ARIA attributes
- Test keyboard navigation (Tab, Enter, Escape)
- Ensure sufficient color contrast

### Z-Index Management

If menu dropdowns appear behind other content:

1. Set `position: relative` on the menu container
2. Add `z-index: 100` (or higher as needed)

## Related Resources

- [Sheet Component](../radix/sheet.md)
- [Slot Component](../core-components/slot.md)
- [Navigation Menu](../radix/navigation-menu.md) - For mega menu dropdowns
- [Responsive design](../foundations/responsive-design.md)
