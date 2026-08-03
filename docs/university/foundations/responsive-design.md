---
description: >-
  Learn how breakpoints work in Webstudio to create responsive designs that adapt to any screen size.
icon: mobile-screen
---

# Responsive design

Webstudio uses a mobile-first approach with customizable breakpoints to create responsive designs. Styles cascade from larger to smaller breakpoints, allowing you to progressively enhance designs for bigger screens.

## Understanding Breakpoints

Breakpoints are found at the top of the Style Panel. Each breakpoint represents a screen width range.

### Default Breakpoints

- **Base** (≥1280px) - Desktop/large screens
- **1280px** - Laptop/medium desktop
- **991px** - Tablet landscape
- **767px** - Tablet portrait
- **479px** - Mobile

{% hint style="info" %}
You can customize breakpoints in Project settings to match your design needs.
{% endhint %}

## Style Cascading

Styles cascade **down** to smaller breakpoints:

- Styles set on **Base** apply to all breakpoints
- Styles set on **991px** apply to 991px and all smaller breakpoints
- Each breakpoint can override inherited styles

### Visual Indicators

The Style Panel uses colors to show where values come from:

| Color      | Meaning                            |
| ---------- | ---------------------------------- |
| **Blue**   | Set on the current breakpoint      |
| **Orange** | Inherited from a larger breakpoint |

Hover over any property label to see exactly where the value comes from, including the breakpoint, token, and instance.

## Common Responsive Patterns

### Flex Direction Change

Convert horizontal layouts to vertical on mobile:

1. On Base breakpoint: `flex-direction: row`
2. On mobile breakpoint: `flex-direction: column`

### Show/Hide Elements

Display different elements on different screen sizes:

1. Select the element to hide on mobile
2. Go to mobile breakpoint
3. Set `display: none`

To show something only on mobile:

1. On Base: `display: none`
2. On mobile: `display: flex` (or `block`)

### Font Size Adjustments

Scale typography for readability:

- Base: `font-size: 48px` for hero headings
- Mobile: `font-size: 32px`

### Container Max-Width

Adjust content width per breakpoint:

- Base: `max-width: 1200px`
- Tablet: `max-width: 100%` with padding

## Important Concepts

### Only Styles Are Affected

Breakpoints only affect **styles**. Settings and component configurations are universal across all breakpoints. For example:

- Link URLs are the same on all breakpoints
- Image sources don't change per breakpoint
- Component settings apply everywhere

### Responsive Layout Techniques

Use these CSS properties for flexible layouts:

- **Flex wrap**: Items wrap to new rows when space is limited
- **Gap**: Consistent spacing that works with wrapping
- **Percentage widths**: Elements scale proportionally
- **Min/max widths**: Set boundaries for flexible sizing

## Workflow Tips

1. **Start from Base** - Design your desktop layout first
2. **Work downward** - Progressively adjust for smaller screens
3. **Use tokens wisely** - Apply breakpoint-specific styles as Local overrides when needed
4. **Test often** - Preview at each breakpoint using the Preview button

{% hint style="warning" %}
When you select a breakpoint and make style changes, those changes affect the current breakpoint AND all smaller breakpoints (unless overridden).
{% endhint %}

## Advanced: Media Conditions

Webstudio supports full media query conditions beyond just screen width, enabling designs that respond to device capabilities and user preferences.

### Creating Custom Breakpoints

1. Click on any breakpoint in the Style Panel
2. Click the **+** button to add a new breakpoint
3. Choose from predefined conditions or create custom ones

### Available Media Conditions

Select from predefined conditions or type a custom one:

| Category           | Values                                                                         |
| ------------------ | ------------------------------------------------------------------------------ |
| **Orientation**    | `portrait`, `landscape`                                                        |
| **Color Scheme**   | `dark`, `light`                                                                |
| **Reduced Motion** | `reduce`, `no-preference`                                                      |
| **Contrast**       | `more`, `less`, `no-preference`                                                |
| **Hover**          | `hover`, `none`                                                                |
| **Any Hover**      | `hover`, `none`                                                                |
| **Pointer**        | `coarse`, `fine`, `none`                                                       |
| **Any Pointer**    | `coarse`, `fine`, `none`                                                       |
| **Display Mode**   | `fullscreen`, `standalone`, `minimal-ui`, `browser`                            |
| **Width / Height** | `min-width`, `max-width`, `min-height`, `max-height` (set via the width input) |

### Example: Dark Mode Support

1. Click on any breakpoint in the Style Panel, then click **+**
2. Select **Color Scheme: Dark** from the condition dropdown
3. Give it a label like "Dark"
4. Select this breakpoint and style your dark theme — the canvas immediately previews it
5. Your published site automatically adapts to the user's system preference

### Example: Touch Device Styles

1. Create a breakpoint with condition **Pointer: Coarse**
2. Increase tap target sizes (minimum 44×44px)
3. Adjust hover-dependent interactions for touch

### Example: Reduced Motion

1. Create a breakpoint with condition **Reduced Motion: Reduce**
2. Disable or simplify animations for users who prefer less motion
3. Improves accessibility for users with vestibular disorders

### Example: PWA Standalone Mode

1. Create a breakpoint with condition **Display Mode: Standalone**
2. Hide browser-specific navigation elements
3. Adjust layout for the standalone app experience

### Live Preview in the Canvas

When you select a condition-based breakpoint, Webstudio **automatically simulates** that condition in the canvas. For example:

- Select a **Dark Mode** breakpoint → the canvas immediately shows your dark styles
- Select a **Portrait** breakpoint → orientation-specific styles apply
- Select a **Reduced Motion** breakpoint → animation changes are visible

No extra toggles or settings are needed — selecting the breakpoint is enough. When you switch back to a width-based breakpoint, the canvas returns to normal.

### How the Simulator Works

The breakpoint simulator dynamically modifies CSS media queries in real-time to preview condition-based styles:

- When you select a condition breakpoint, matching media rules are replaced with always-true queries
- Non-matching rules are made always-false
- This allows you to preview dark mode, reduced motion, and other conditions without changing system settings
- Original media queries are automatically restored when you switch to a different breakpoint

The simulation affects **only** the builder canvas and does not change your browser, device, or system settings.

{% hint style="info" %}
The simulation only affects the builder canvas preview. Published sites use the actual media queries and respond to real user preferences and device capabilities.
{% endhint %}

{% hint style="info" %}
Media conditions can be combined. For example, you could create a breakpoint that applies only to small screens in landscape orientation.
{% endhint %}

## Related Videos

{% embed url="https://www.youtube.com/watch?v=gxCAfWdULzw" %}
