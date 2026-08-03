---
description: Add visual dividers between content sections in Webstudio.
---

# ➖ Separator

> See [MDN: \<hr\>](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/hr)

The Separator component creates a visual divider between content sections. It renders as a semantic `<hr>` (horizontal rule) element or can be styled as a vertical divider.

## When to Use

Use Separator for:

- Dividing sections of content
- Separating items in a list or menu
- Creating visual breaks in long content
- Organizing navigation or sidebar elements

## How to Use

1. Drag a **Separator** component from Components > General onto your canvas
2. Position it between the content sections you want to divide
3. Style using the Style Panel (color, thickness, margins)

## Styling

### Horizontal Separator (Default)

```css
width: 100%;
height: 1px;
background-color: #e0e0e0;
border: none;
margin: 16px 0;
```

### Vertical Separator

For a vertical divider (useful in horizontal layouts):

```css
width: 1px;
height: 100%;
background-color: #e0e0e0;
align-self: stretch;
margin: 0 16px;
```

### Decorative Separator

Create more decorative dividers:

```css
width: 50%;
height: 2px;
background: linear-gradient(to right, transparent, #primary, transparent);
margin: 32px auto;
```

## Properties

Some commonly used properties (see the Settings panel for all available options):

| Property        | Description                              |
| --------------- | ---------------------------------------- |
| **orientation** | `horizontal` (default) or `vertical`     |
| **decorative**  | If true, removes from accessibility tree |

## Related

- [Element](element.md) – Generic HTML containers
- [List](list.md) – Ordered and unordered lists
- [Blockquote](blockquote.md) – Quoted content
