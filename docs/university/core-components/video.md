---
description: Embed self-hosted videos in Webstudio pages.
---

# Video

> See [MDN: \<video\>](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video)

The **Video** component embeds an HTML5 `<video>` element for playing self-hosted video files.

## Overview

Use the Video component when you have your own video files to host, rather than embedding from platforms like YouTube or Vimeo. For platform embeds, use the [YouTube](youtube.md) or [Vimeo](vimeo.md) components instead.

## Properties

| Property      | Type    | Description                            |
| ------------- | ------- | -------------------------------------- |
| `src`         | string  | URL to the video file                  |
| `poster`      | string  | Image shown before video plays         |
| `autoplay`    | boolean | Start playing automatically            |
| `controls`    | boolean | Show video controls                    |
| `loop`        | boolean | Loop video continuously                |
| `muted`       | boolean | Mute audio by default                  |
| `playsinline` | boolean | Play inline on mobile (vs fullscreen)  |
| `preload`     | string  | Preload behavior: none, metadata, auto |
| `width`       | string  | Video width                            |
| `height`      | string  | Video height                           |
| `id`          | string  | Unique identifier                      |
| `class`       | string  | CSS class names                        |

## Basic Usage

```
Video
  src: /videos/intro.mp4
  controls: true
  poster: /images/video-poster.jpg
```

## Video Formats

For best browser compatibility, provide multiple formats:

| Format      | MIME Type  | Support            |
| ----------- | ---------- | ------------------ |
| MP4 (H.264) | video/mp4  | Best compatibility |
| WebM        | video/webm | Modern browsers    |
| OGG         | video/ogg  | Older Firefox      |

MP4 is recommended as the primary format.

## Autoplay Requirements

Browsers restrict autoplay to prevent unwanted media:

### Autoplay with Sound

- Requires user interaction first
- Won't work on page load

### Autoplay Muted ✓

- Works on page load
- Must include `muted: true`

```
Video
  autoplay: true
  muted: true
  loop: true
```

## Background Video

Create video backgrounds:

1. Set Video properties:
   - `autoplay: true`
   - `muted: true`
   - `loop: true`
   - `playsinline: true`

2. Style the Video:
   - Position: absolute
   - Object-fit: cover
   - Width/Height: 100%

3. Place in a container:
   - Position: relative
   - Overflow: hidden

```
Box (position: relative, overflow: hidden)
├── Video (position: absolute, inset: 0, object-fit: cover)
│     autoplay, muted, loop
└── Box (position: relative, z-index: 1)
    └── Content overlaying video
```

## Preload Options

| Value      | Description                       |
| ---------- | --------------------------------- |
| `none`     | Don't preload anything            |
| `metadata` | Load dimensions and duration only |
| `auto`     | Browser decides what to preload   |

Use `metadata` for most cases to balance performance and user experience.

## Responsive Video

### Maintain Aspect Ratio

```
Box (aspect-ratio: 16/9)
└── Video (width: 100%, height: 100%, object-fit: cover)
```

### Different Sources for Breakpoints

For different video qualities at different screen sizes, you may need custom HTML using [HTML Embed](html-embed.md).

## Poster Image

The `poster` attribute shows an image before the video plays:

- Use a relevant frame from the video
- Optimize the image for quick loading
- Match the video's aspect ratio

## Performance Tips

1. **Compress videos**: Use tools like HandBrake or FFmpeg
2. **Consider file size**: Videos should be as small as possible
3. **Use lazy loading**: Set preload to "none" for off-screen videos
4. **Provide poster**: Show placeholder while video loads
5. **Host on CDN**: Fast delivery from edge servers

## Accessibility

1. **Provide captions**: Add text tracks for hearing impaired
2. **Avoid autoplay audio**: Always mute autoplay videos
3. **Include controls**: Let users pause/play
4. **Don't autoplay with motion**: Can trigger vestibular issues

## When to Use

| Use Video            | Use YouTube/Vimeo |
| -------------------- | ----------------- |
| Self-hosted files    | Platform content  |
| Background videos    | SEO benefits      |
| Full control needed  | Free hosting      |
| Privacy requirements | Analytics needed  |
| Custom player UI     | Social features   |

## Related Components

- [YouTube](youtube.md) - YouTube video embeds
- [Vimeo](vimeo.md) - Vimeo video embeds
- [Vimeo Background Video](vimeo-background-video.md) - Vimeo for backgrounds
- [Image](image.md) - Static images
