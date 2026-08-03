---
description: >-
  In this article, we will learn how to render optimized, responsive images for
  a site using the Image Component in Webstudio.
---

# 🖼️ Image

> See [MDN: \<img\>](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img)

{% embed url="https://www.youtube.com/watch?v=o2tEwZ_zeUI" %}

---

### How to use the Image component

The "Image Component" can be found in Components > Media, and you can place it on your canvas by dragging and dropping it or clicking it in the Components panel. ![Webstudio image component](../../.gitbook/assets/image-component-overview.webp)

#### Responsive Images

Webstudio automatically generates responsive images for your website, so you don't have to worry about manually resizing and optimizing images for different devices.

These responsive images automatically adjust their size based on the user's screen size, ensuring optimal resolution and quick loading whether the user is on a desktop monitor or a smartphone.

#### Supported Image Formats

All images in Webstudio are automatically optimized and served in WebP or AVIF format, depending on the responsive image resolution and browser support. This eliminates the need for pre-optimization and extra tools to compress or convert images.

WebP is supported by all modern browsers, including Chrome, Edge, and Firefox, while AVIF offers better compression quality and smaller file sizes but lacks support in browsers like Edge and Internet Explorer.

#### Ensure a Stable Layout for Improved Performance

It is essential to ensure that your browser can calculate an image's width and height without waiting for it to load. You can do this by setting the image's width/height in the Style panel or directly in the Image instance's properties.

When you set an image's width and aspect ratio, your browser can calculate its height. You can define the width, height, and aspect ratio in the parent element's Style panel, or it can be hinted at by the layout around the image.

If a browser can't calculate an image's size, it continues rendering the page, but the image element remains collapsed. Once the browser figures out the size of the unhinted image, it renders that image and recalculates every component on the site. This can create a glitch-like effect on the live site and negatively impact site performance.

> Note: You can assess page speed using tools like [Page Speed](https://pagespeed.web.dev/). For reference, an unhinted hero image can easily decrease the page speed score from 100 to 70!

#### Provide Aspect Ratio Upfront

In Webstudio, every image has its aspect ratio set automatically. To prevent any layout shifts on your site, it's best to set the "width" property for each image you add. This ensures that the images fit smoothly into the overall design without causing any unexpected changes in layout.

---

### How to customize an Image instance's properties

You can customize the properties of an Image instance by selecting it and going to "Settings." Here is an overview of each property:

#### Source

The Source property lets you link an image file from the Assets Panel to your image instance. To add an image to your instance, click "Choose source" and select an image from the Assets Panel.

If your image is not in the Assets Panel, you can upload it from your computer files.

You can also drag a single image from the Assets panel directly onto the canvas.
Webstudio inserts a new Image component and selects the dragged asset as its
source.

#### Width/Height

The "width" and "height" properties define your image's initial display size in pixels and its aspect ratio. However, the final rendered image size is subject to CSS rules and layout constraints.

This means that if you set the width or height of an image in the Style panel or the layout limits the space for the image, the Width/Height properties for the Image instance will be ignored.

The Width/Height properties are prioritized in some cases. For instance, if you only set the image's height in the Style panel, the width will be automatically determined from the Image Instance's "Width" property, and vice versa. This maintains the aspect ratio while adjusting the image's size with your specified values.

#### Alternative Text (alt)

The "alt" property provides alternative text for the image. This text is vital for accessibility purposes, as it describes the image's content in case the image cannot be seen.

#### Loading

The "Loading" property specifies how the browser handles image loading. You can set it to "Lazy" to load the image only when it comes into the viewport or "Eager" to load it immediately.

Here's a helpful tip: If you have an image in the initial viewport, always set it to "Eager." This way, the image gets priority, and it loads quickly, improving your site's overall performance.

#### Optimize

The "optimize" property lets you control if the image will go through the image transformation process including resizing, converting, and compressing it. This setting works on first and third-party images (e.g., images that come from a headless CMS). In rare scenarios, the user may want to turn this off.

## Related

- [Vimeo](vimeo.md) – Embed Vimeo videos
- [YouTube](youtube.md) – Embed YouTube videos
- [Link](link.md) – Make images clickable
