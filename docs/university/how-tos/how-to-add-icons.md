---
description: Add icons to your Webstudio site using SVGs and icon libraries.
---

# ▶ How to add icons

{% embed url="https://youtu.be/IqoNtd6g57E?si=EVapmuGdHLY0WMFh" %}

This guide shows you how to easily add icons to your Webstudio website.

## Method 1: Pasting SVG Directly into the Builder (Recommended)

The easiest and most powerful approach is to copy SVG code and paste it directly into Webstudio. This creates native SVG components that you can fully style and manipulate.

### Step-by-Step

1. Find an icon from a library like [Heroicons](https://heroicons.com/), [Lucide](https://lucide.dev/), or [Feather Icons](https://feathericons.com/)
2. Copy the SVG code for the icon
3. In Webstudio, click where you want the icon on the canvas
4. Paste (Cmd+V / Ctrl+V) — Webstudio will automatically create the SVG structure with proper components

Webstudio converts the SVG into native components, giving you full control over styling each part directly in the Style panel.

### SVG Properties in Style Panel

When you select an SVG element, the Style Panel shows SVG-specific CSS properties, including:

- **fill** – The fill color of the shape
- **stroke** – The stroke (outline) color
- **stroke-width** – The thickness of the stroke
- **fill-opacity** – Transparency of the fill
- **stroke-opacity** – Transparency of the stroke
- **stroke-linecap** – Shape at the end of lines (butt, round, square)
- **stroke-linejoin** – Shape at corners (miter, round, bevel)
- **stroke-dasharray** – Create dashed lines
- **stroke-dashoffset** – Offset for dash pattern

And many more SVG-specific properties.

### SVG Attribute Autocompletion

In the Settings Panel, when you add custom attributes to SVG elements, Webstudio provides autocompletion for all valid SVG attributes. This helps you set properties like:

- `viewBox` – Define the coordinate system
- `preserveAspectRatio` – Control scaling behavior
- `transform` – Apply transformations
- Path-specific attributes like `d`, `points`, `cx`, `cy`, `r`, etc.

{% hint style="success" %}
Pasting SVG creates native components that can be styled with CSS variables, allowing you to create icons that change color based on themes or states.
{% endhint %}

## Method 2: Using HTML Embed with SVG

For more complex SVGs or when you need the raw SVG code:

1. Add an **HTML Embed** component where you want the icon
2. Paste the SVG code into the HTML Embed
3. Style the icon using inline attributes or CSS

### Styling SVG Icons

To control icon color and size, modify the SVG:

```html
<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
  <!-- icon path here -->
</svg>
```

Using `currentColor` allows the icon to inherit text color from its parent.

## Method 3: Using Icon Fonts

You can also use icon fonts like Font Awesome:

1. Add the Font Awesome CSS to your project's custom code (Project settings > Custom Code)
2. Use an HTML Embed with the icon's HTML class: `<i class="fa-solid fa-star"></i>`

## Method 4: Using Image Component

For simple icons that don't need color changes:

1. Export your icon as PNG or SVG file
2. Upload to Webstudio Assets
3. Add an Image component and select the uploaded icon
4. Set appropriate width/height

## Related

- [Image](../core-components/image.md) – Use images for simple icon needs
- [HTML Embed](../core-components/html-embed.md) – Embed custom SVG code and icon fonts
- [Design tokens](../foundations/design-tokens.md) – Create reusable color tokens for icon styling
- [Variables](../foundations/variables.md) – Use CSS variables to dynamically change icon colors
