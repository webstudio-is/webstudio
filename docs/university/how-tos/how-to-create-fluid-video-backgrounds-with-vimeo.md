---
description: Create fluid video backgrounds in Webstudio using Vimeo.
---

# ▶ How to create fluid video backgrounds with Vimeo

{% embed url="https://youtu.be/XO3AntguPZE?si=gGQ_93CXQWLnoLwP" %}

Create stunning full-width video backgrounds that scale beautifully across all screen sizes using Vimeo.

## Overview

Video backgrounds can add visual impact to your website. Using the **Vimeo** component in Webstudio, you can create fluid, responsive video backgrounds that cover their container perfectly.

## Component Structure

```
Hero (Box)
├── Content (Box) - z-index: 2
│   └── Your headings, text, buttons
└── Background Video (Box)
    ├── Overlay (Box) - position: absolute, inset: 0, z-index: 1
    └── Vimeo - position: absolute, inset: 0
```

## Step-by-Step Guide

### 1. Set Up the Hero Box

1. Add a **Box** component to your page (name it "Hero")
2. Set **Display**: Flex (centered)
3. Set **Position**: Relative
4. Set **Overflow**: Hidden

### 2. Add the Background Video Box

1. Inside the Hero, add another **Box** (name it "Background Video")
2. Set **Min-width**: 100%
3. Set **Min-height**: 100%
4. Set **Aspect ratio**: 16:9 (important — Vimeo forces this ratio)
5. Set **Overflow**: Hidden
6. Set **Position**: Absolute

### 3. Add the Overlay

1. Inside Background Video Box, add a **Box** (name it "Overlay")
2. Set **Position**: Absolute
3. Set all sides (top, right, bottom, left) to 0 (hold Shift while dragging)
4. Set **Z-index**: 1
5. Add a semi-transparent background color for text readability

### 4. Add the Vimeo Component

1. Add a **Vimeo** component inside the Background Video Box
2. Enter your Vimeo video URL
3. Remove the default width and aspect ratio
4. Set **Position**: Absolute with all sides at 0
5. Configure settings:
   - **Enable**: Show Preview, Autoplay, Background Mode, Loop, Muted, Do Not Track
   - **Disable**: Portrait (avatar), Controls
6. Hide the **Spinner** and **Play Button** instances (they're not needed for background video)

### 5. Add the Content Box

1. Add another **Box** inside Hero (name it "Content")
2. Set **Z-index**: 2 (so content appears above the overlay and video)
3. Add padding to control the section height
4. Add your content (headings, text, buttons)

{% hint style="info" %}
The video background automatically scales because the container grows with the content's padding. Add padding to the Content box to control the overall section height.
{% endhint %}

## Tips

- **Performance**: Compress videos and keep them short for faster loading
- **Mobile**: Consider hiding video backgrounds on mobile and using a static image instead
- **Accessibility**: Don't rely on video content to convey critical information
- **Fallback**: Add a poster image or background color for loading states

## Related

- [Vimeo Background Video](../core-components/vimeo-background-video.md) – Simplified component for video backgrounds
- [Vimeo](../core-components/vimeo.md) – Embed Vimeo videos with full controls
- [Image](../core-components/image.md) – Use images as fallback backgrounds
- [Animations](../foundations/animations.md) – Add motion to your video sections
