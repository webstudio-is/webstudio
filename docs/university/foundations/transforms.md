---
description: >-
  CSS Transforms enable you to rotate, scale, skew, and translate elements to create dynamic visual effects.
icon: arrows-rotate
---

# Transforms

CSS Transforms allow you to visually manipulate elements by rotating, scaling, skewing, or moving them. They're powerful for creating interactive effects like hover animations and dynamic layouts.

## Accessing Transforms

1. Select an instance in the canvas
2. Open the **Style Panel** on the right
3. Scroll to the **Transforms** section (or search for "transform")
4. Click the **+** button to add a transform

<figure><img src="../../.gitbook/assets/transforms-section.png" alt="Transforms section in the Style Panel with a rotate transform added"><figcaption><p>The Transforms section in the Style Panel</p></figcaption></figure>

## Transform Properties

### Translate

Move an element horizontally (X) or vertically (Y) without affecting the document flow:

- **translateX**: Move left (negative) or right (positive)
- **translateY**: Move up (negative) or down (positive)
- **translateZ**: Move forward/backward (for 3D effects)

### Rotate

Spin an element around its center point:

- **rotate**: 2D rotation (e.g., `45deg` rotates 45 degrees clockwise)
- **rotateX/Y/Z**: 3D rotation around specific axes

### Scale

Resize an element:

- **scaleX**: Stretch horizontally
- **scaleY**: Stretch vertically
- **scale**: Uniform scaling (1 = original, 2 = double, 0.5 = half)

### Skew

Tilt an element:

- **skewX**: Slant horizontally
- **skewY**: Slant vertically

### Transform Origin

Set the point around which transforms occur (default is center):

- **transform-origin**: e.g., `top left`, `center`, `50% 50%`

## Combining Multiple Transforms

You can stack multiple transforms on a single element. Each transform is applied in order, which affects the final result.

## Common Use Cases

### Card Hover Effect

Create an interactive card that lifts on hover:

1. Add a Box element and style it as a card
2. Add a subtle `box-shadow`
3. Select the **Hover** state from the States dropdown
4. Add transforms:
   - `translateY: -8px` (lift the card)
   - `rotate: 2deg` (slight tilt)
5. Switch back to the default state
6. Add a `transition` property: `transform 0.3s ease`

### Button Scale Effect

Make buttons feel tactile:

1. Select your button
2. In the Hover state, add `scale: 1.05`
3. Add `transition: transform 0.2s ease` on the default state

### Rotating Icons

Create spinning icons for loading states:

1. Select an icon
2. Add `rotate: 360deg` in an animation or hover state

## Transforms with Transitions

Transforms are most effective when combined with [CSS Transitions](animations.md#css-transitions) for smooth animations:

1. Apply the **transform** on the target state (hover, focus, etc.)
2. Apply the **transition** on the default state
3. The transition property should include `transform` (e.g., `transition: transform 0.3s ease`)

{% hint style="info" %}
**Tip:** For hover effects, always add the transition on the default state, not the hover state. This ensures smooth animation both on hover and when the cursor leaves.
{% endhint %}

## Z-Index with Transforms

When lifting elements with translateY on hover, you may want them to appear above siblings:

1. Set `position: relative` on the element
2. On hover, increase `z-index` (e.g., `z-index: 10`)

## Performance Considerations

Transforms are GPU-accelerated, making them ideal for animations:

- Prefer `transform: translate()` over `top/left` for movement
- Prefer `transform: scale()` over `width/height` for resizing
- These properties don't trigger layout recalculation, resulting in smoother 60fps animations

## Related

- [Animations](animations.md) – Create scroll-driven and interactive animations
- [CSS variables](css-variables.md) – Define reusable style values
- [Animation Group](../core-components/animation-group.md) – Container for scroll-driven animations
- [Anatomy of the Webstudio builder](anatomy-of-the-webstudio-builder.md) – Learn about the Style Panel
