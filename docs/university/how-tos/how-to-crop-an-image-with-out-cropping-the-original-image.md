---
description: Crop images visually in Webstudio without modifying the original file.
---

# ▶ How to crop an image with out cropping the original image

{% embed url="https://www.tella.tv/video/clq6kyooj00580fl80ju020i9/view" %}

Learn how to visually crop images in Webstudio without modifying the original image file.

## Overview

Sometimes you need an image to fit a specific shape or aspect ratio without altering the source file. Webstudio allows you to "crop" images visually using CSS properties, keeping your original image intact.

## Method 1: Using Object-Fit

The most common approach uses the `object-fit` CSS property.

### Steps

1. Add an **Image** component to your page
2. Select your image from Assets
3. Set a specific **width** and **height** on the image (e.g., 400px × 300px)
4. In the Styles panel, set `object-fit` to `cover`
5. Use `object-position` to control which part of the image is visible:
   - `center` (default) - shows the center
   - `top` - shows the top portion
   - `bottom` - shows the bottom portion
   - `left` / `right` - for horizontal positioning
   - Custom values like `50% 25%` for precise control

### Object-Fit Values

| Value | Behavior |
|-------|----------|
| `cover` | Fills container, may crop edges |
| `contain` | Fits entire image, may letterbox |
| `fill` | Stretches to fill (distorts) |
| `none` | Natural size, may overflow |

## Method 2: Using Overflow Hidden

This method uses a container to mask parts of the image.

### Steps

1. Add a **Box** component
2. Set the Box's dimensions to your desired "crop" size
3. Set `overflow: hidden` on the Box
4. Add an **Image** inside the Box
5. Make the image larger than the container
6. Position the image using `transform: translate()` or negative margins

## Method 3: Using Aspect Ratio

For responsive cropping that maintains proportions:

1. Add an **Image** component
2. Set width to `100%` (or desired width)
3. Set a specific `aspect-ratio` (e.g., `16/9`, `1/1`, `4/3`)
4. Set `object-fit: cover`

## Common Use Cases

- **Profile pictures**: Square crop with `aspect-ratio: 1/1`
- **Hero banners**: Wide crop with `aspect-ratio: 21/9`
- **Thumbnails**: Consistent card images with `aspect-ratio: 16/9`
- **Circular crops**: Add `border-radius: 50%` to any square aspect ratio

## Tips

- Always use `object-fit: cover` when setting fixed dimensions on images
- Use the **Design** tab to preview how your "crop" looks at different viewport sizes
- Consider creating multiple crops in your image editor only if you need significantly different compositions for mobile vs desktop

## Related

- [Image](../core-components/image.md) – Learn about the Image component and its properties
- [Design tokens](../foundations/design-tokens.md) – Create reusable styles for consistent image sizing
- [Collection](../core-components/collection.md) – Display cropped images in dynamic lists
