---
description: Build accessible navigation menus with Radix UI in Webstudio.
---

# Navigation Menu

> Based on [Radix Navigation Menu](https://www.radix-ui.com/primitives/docs/components/navigation-menu)

The Navigation Menu component creates accessible, multi-level navigation with dropdown menus. It's ideal for website headers with organized sections of links.

## When to Use

Use Navigation Menu for:

- Main website navigation in headers
- Complex navigation with multiple categories
- Mega menus with organized link groups
- Any multi-level navigation structure

## Structure

The Navigation Menu component consists of:

| Component                    | Description                     |
| ---------------------------- | ------------------------------- |
| **Navigation Menu**          | The root container              |
| **Navigation Menu List**     | Container for menu items        |
| **Navigation Menu Item**     | Wrapper for each top-level item |
| **Navigation Menu Trigger**  | Button that opens a dropdown    |
| **Navigation Menu Content**  | The dropdown panel              |
| **Navigation Menu Link**     | A navigation link               |
| **Navigation Menu Viewport** | Where dropdown content renders  |

## How to Use

1. Drag a **Navigation Menu** component from Components > Radix onto your canvas
2. The component comes with sample navigation structure
3. Edit Navigation Menu Links for simple links
4. Use Navigation Menu Trigger + Content for dropdown sections
5. Add your links and content inside each dropdown
6. Style all parts to match your design

### Simple Link (No Dropdown)

For a link without a dropdown, use just a Navigation Menu Link inside the Navigation Menu Item.

### Dropdown Menu

For a dropdown:

1. Add a Navigation Menu Trigger (the clickable text)
2. Add Navigation Menu Content (the dropdown panel)
3. Add your links and content inside Content

## Properties

Some commonly used properties (see the Settings panel for all available options):

### Navigation Menu Link

| Property | Description                |
| -------- | -------------------------- |
| **href** | The URL the link points to |

### Navigation Menu Content

| Property      | Description                                       |
| ------------- | ------------------------------------------------- |
| (Positioning) | Content automatically positions below the trigger |

## Styling States

Some common states (you can also create custom states):

- **Open** (`[data-state=open]`) - Dropdown is visible
- **Closed** (`[data-state=closed]`) - Dropdown is hidden
- **Active** - Current page indicator

## Building a Mega Menu

For large navigation with multiple columns:

1. Inside Navigation Menu Content, create a grid layout
2. Add multiple columns with Link groups
3. Optionally add featured content or images
4. Use the Viewport to control the dropdown container

## Related Videos

{% embed url="https://www.youtube.com/watch?v=1xSrvEkXWws" %}
