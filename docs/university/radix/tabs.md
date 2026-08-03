---
description: Create tabbed interfaces with Radix UI in Webstudio.
---

# Tabs

> Based on [Radix Tabs](https://www.radix-ui.com/primitives/docs/components/tabs)

The Tabs component displays a set of panels with content that are shown one at a time. Users can switch between panels by clicking on tab triggers.

## When to Use

Use Tabs for:

- Organizing related content into sections
- Settings pages with multiple categories
- Product pages with details, reviews, and specifications
- Any content that can be logically grouped

## Structure

The Tabs component consists of several parts:

| Component       | Description                                         |
| --------------- | --------------------------------------------------- |
| **Tabs**        | The root component that manages which tab is active |
| **Tabs List**   | Container for all the tab triggers                  |
| **Tab Trigger** | The clickable tab button                            |
| **Tab Content** | The panel content shown when a tab is active        |

## How to Use

1. Drag a **Tabs** component from Components > Radix onto your canvas
2. The component comes with two tabs pre-configured
3. To add more tabs:
   - Duplicate a **Tab Trigger** inside the Tabs List
   - Duplicate a **Tab Content** panel
4. Tab Triggers and Tab Contents are connected by their order in the Navigator
   - The first Trigger shows the first Content, second shows second, etc.

## Using with Collections

When generating tabs dynamically with a [Collection](../core-components/collection.md), you need to provide a unique `value` property for both the Tab Trigger and Tab Content:

1. Add the `value` property to Tab Trigger: Settings > Properties & Attributes > "+"
2. Add the same `value` property to the corresponding Tab Content
3. Bind a unique identifier (like an ID or slug) from your data to both

## Properties

Some commonly used properties (see the Settings panel for all available options):

| Property  | Description                                                                    |
| --------- | ------------------------------------------------------------------------------ |
| **value** | The currently active tab. Use this to control which tab is shown on the canvas |

## Styling States

Some common states (you can also create custom states):

- **Active** (`[data-state=active]`) - The currently selected tab trigger
- **Inactive** (`[data-state=inactive]`) - Unselected tab triggers

## Related

- [Accordion](./accordion.md) – Vertically stacked expandable sections
- [Collapsible](./collapsible.md) – Single expandable panel
- [Collection](../core-components/collection.md) – Generate tabs dynamically from data
- [Navigation Menu](./navigation-menu.md) – Navigation with dropdowns and links
