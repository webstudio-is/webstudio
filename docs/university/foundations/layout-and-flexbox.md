---
description: Learn how to create multi-column layouts and control element positioning using Flexbox in Webstudio.
---

# 📐 Layout & Flexbox

Understanding layout is fundamental to building websites in Webstudio. This guide covers the display modes, Flexbox properties, and best practices for creating responsive layouts.

{% embed url="https://www.youtube.com/watch?v=12cJHLhaBFk" %}
Style Panel Overview & Flexbox Basics
{% endembed %}

---

## Display Modes

The **Display** property in the Layout section controls how an element and its children are positioned. The main display modes are:

| Display          | Description                                                     |
| ---------------- | --------------------------------------------------------------- |
| **Block**        | Default for boxes. Elements stack vertically, taking full width |
| **Flex**         | Enables flexible layouts with horizontal/vertical axis control  |
| **Grid**         | Two-dimensional layout system (rows and columns)                |
| **Inline**       | Elements flow inline like text                                  |
| **Inline Block** | Inline flow but respects width/height                           |
| **None**         | Hides the element completely                                    |

<figure><img src="../../.gitbook/assets/layout-section.png" alt="Layout section in the Style Panel showing display mode and flex controls"><figcaption><p>The Layout section in the Style Panel</p></figcaption></figure>

---

## Flexbox Fundamentals

Flexbox is the primary tool for creating layouts in Webstudio. When you change display to **Flex**, you gain control over how child elements are arranged.

### Enabling Flexbox

1. Select the **parent** container (the element that holds your items)
2. Go to the **Style Panel** → **Layout** section
3. Change **Display** from `Block` to `Flex`

### Flex Direction

Control whether children are arranged horizontally or vertically:

- **Row** (default): Items arranged horizontally left to right
- **Row Reverse**: Items arranged horizontally right to left
- **Column**: Items stacked vertically top to bottom
- **Column Reverse**: Items stacked vertically bottom to top

### Alignment

Flexbox provides two axes for alignment:

| Property            | Description                                                                |
| ------------------- | -------------------------------------------------------------------------- |
| **Justify Content** | Aligns items along the main axis (horizontal for row, vertical for column) |
| **Align Items**     | Aligns items along the cross axis                                          |

Common alignment values:

- **Start**: Items at the beginning
- **Center**: Items centered
- **End**: Items at the end
- **Space Between**: Equal space between items
- **Space Around**: Equal space around items
- **Space Evenly**: Equal space including edges

### Gap

Add consistent spacing between flex items using the **Gap** property. This is cleaner than adding margins to individual items.

### Flex Wrap

By default, flex items try to fit on one line. Enable **Flex Wrap** to allow items to wrap to the next line when they don't fit:

1. In the Layout section, find the **Wrap** toggle
2. Click to enable wrapping
3. Items will now flow to the next line when space runs out

{% hint style="info" %}
Flex wrap is essential for responsive card layouts. Combined with min-width on cards, they'll automatically stack on smaller screens.
{% endhint %}

---

## Common Layout Patterns

### Multi-Column Card Layout

{% embed url="https://www.youtube.com/watch?v=oL42jVHlaqE" %}
Building Your First Section
{% endembed %}

Structure:

```
Section (semantic tag)
└── Container (max-width, centered)
    └── Cards (flex parent)
        ├── Card
        ├── Card
        └── Card
```

Steps:

1. Create a **Box** and change tag to `section`
2. Add a **Box** inside as a container (for max-width)
3. Add another **Box** for the cards wrapper
4. Set the cards wrapper to `display: flex`
5. Add **Gap** between cards
6. Enable **Flex Wrap** for responsiveness
7. Add individual **Card** boxes inside

### Centering Content

To center a single element both horizontally and vertically:

1. Set parent to `display: flex`
2. Set **Justify Content** to `Center`
3. Set **Align Items** to `Center`

### Navigation Layout

For a typical header with logo and nav items:

1. Header container: `display: flex`
2. **Justify Content**: `Space Between` (logo left, nav right)
3. **Align Items**: `Center` (vertically centered)

---

## Sizing Properties

### Width & Height

| Property       | Description                        |
| -------------- | ---------------------------------- |
| **Width**      | Fixed width of element             |
| **Min Width**  | Minimum width (won't shrink below) |
| **Max Width**  | Maximum width (won't grow beyond)  |
| **Height**     | Fixed height of element            |
| **Min Height** | Minimum height                     |
| **Max Height** | Maximum height                     |

### Flex Child Properties

When an element is inside a flex container, additional properties become available:

| Property        | Description                                              |
| --------------- | -------------------------------------------------------- |
| **Flex Grow**   | How much the item should grow relative to siblings       |
| **Flex Shrink** | How much the item should shrink relative to siblings     |
| **Flex Basis**  | Initial size before growing/shrinking                    |
| **Align Self**  | Override the parent's align-items for this specific item |

---

## Container Best Practices

### Section + Container Pattern

A common pattern for page sections:

1. **Outer Box** (Section tag)
   - Full width background colors
   - Vertical padding for spacing

2. **Inner Box** (Container)
   - `max-width: 1200px` (or your preferred max)
   - `margin: 0 auto` (centers horizontally)
   - Horizontal padding for mobile edges

This allows backgrounds to extend full width while content stays contained.

### Naming Convention

Use clear names for organization:

- **Plural** for parent containers: `Cards`, `Features`, `Testimonials`
- **Singular** for individual items: `Card`, `Feature`, `Testimonial`

---

## Learning CSS Properties

All properties in Webstudio's Style Panel use standard CSS names. To learn more about any property:

1. **Hover** over the property name for a tooltip explanation
2. **Search online** for "CSS [property-name]" (e.g., "CSS flex-wrap")
3. Resources like [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/CSS) provide detailed documentation

{% hint style="info" %}
Creating layouts is primarily done through styling, not components. You won't find a "columns" component — instead, you create columns by applying flex properties to boxes.
{% endhint %}

---

## Visual Indicators

The Style Panel uses colors to indicate property states:

| Color        | Meaning                                                                   |
| ------------ | ------------------------------------------------------------------------- |
| **Blue**     | Property is set on the current element/token                              |
| **Orange**   | Property is inherited from a parent or cascading from a larger breakpoint |
| **No color** | Property is using browser default                                         |

---

## Related Resources

- [Responsive design](responsive-design.md) — Working with breakpoints
- [Design tokens](design-tokens.md) — Creating reusable styles
- [Custom classes & attributes](custom-classes-and-attributes.md) — Advanced styling options
