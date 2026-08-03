---
description: >-
  The Video Animation component renders a video and starts it based on Animation
  Group settings.
---

# 🎥 Video Animation

To play a video when it enters the scroll port, you can insert an Animation Group and then insert Video Animation inside it. Upload a short video directly to Webstudio and select it in the Video instance inside Video Animation. The video will start playing according to the Animation Group settings once the video reaches a certain position in the scroll port.

{% hint style="info" %}
Video Animation is one component of the animation engine. See [Animations](../foundations/animations.md) for an overview.
{% endhint %}

{% hint style="info" %}
Just remember that you'll need to wrap the Video Animation component in an Animation Group to define and control the actual animation behavior. The Animation Group must be the **direct** **parent** of the Video Animation.
{% endhint %}

## Structure

Video Animation expects a Video component inside it. When you insert the Video Animation template, Webstudio creates this structure for you:

```html
<AnimationGroup>
  <VideoAnimation>
    <Video />
  </VideoAnimation>
</AnimationGroup>
```

Configure the video source on the Video child.

## Settings

### Timeline

When Timeline is enabled, the Video child receives timeline progress from the parent Animation Group. Use this when you want video playback to follow scroll/view progress. When Timeline is disabled, the Video child still receives visibility/progress state from the group.

## Usage notes

- Use short videos for scroll-linked playback.
- Videos with frequent keyframes seek more smoothly when playback follows scroll progress.
- A common setup is a view-based Animation Group with a `cover 0%` to `cover 100%` range so the video responds while the element covers the scrollport.
- Keep the Video Animation component as the direct child of Animation Group; put the actual Video component inside Video Animation.

## Related

- [Animation Group](animation-group.md) – Required parent for video animation
- [Vimeo](vimeo.md) – Embed Vimeo videos
- [YouTube](youtube.md) – Embed YouTube videos
