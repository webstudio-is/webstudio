---
description: Achieve perfect Lighthouse scores with Webstudio's built-in optimizations and best practices.
---

# ⚡ Performance

Webstudio sites are fast by default. This guide covers what's automatic and what you control.

## Measuring Performance: Core Web Vitals vs PageSpeed

[PageSpeed Insights](https://pagespeed.web.dev/) runs a single Lighthouse test from one server location. It's useful for spotting issues, but a single synthetic test doesn't reflect real-world performance.

**Core Web Vitals** (LCP, CLS, INP) are what actually matter—they measure real user experiences across all devices, networks, and locations. A site can score 100 on PageSpeed but still have poor Core Web Vitals if real users experience slow loads.

Check your Core Web Vitals in:

- [Google Search Console](https://search.google.com/search-console) – Real field data from Chrome users
- [PageSpeed Insights](https://pagespeed.web.dev/) – The "Field Data" section at the top (if available)

Focus on passing Core Web Vitals thresholds, not chasing a perfect Lighthouse score.

## What Webstudio Does Automatically

### Image Optimization

The [Image component](../core-components/image.md) automatically:

- **Converts images to WebP/AVIF** – Modern formats with better compression
- **Compresses images** – Reduces file size without visible quality loss
- **Generates responsive sizes** – Serves appropriately sized images based on screen width
- **Sets width and height attributes** – Prevents Cumulative Layout Shift (CLS)

You upload a high-quality image once, and visitors receive an optimized version.

{% hint style="info" %}
These optimizations only apply to the **Image component**. Images added via HTML Embed, Content Embed, or other methods won't receive automatic optimization.
{% endhint %}

### Cloudflare Edge Deployment

Published sites deploy to [Cloudflare Workers](https://webstudio.is/cloudflare-website-builder) across 320+ global locations. Your site loads from the server closest to each visitor.

### Atomic CSS

Webstudio generates minimal CSS. Styles are deduplicated and optimized, resulting in smaller file sizes than traditional class-based approaches.

### Server-Side Rendering (SSR)

Pages are rendered on the server and delivered as complete HTML. This improves:

- **First Contentful Paint (FCP)** – Content appears faster
- **SEO** – Search engines receive fully rendered pages
- **Time to Interactive** – Less JavaScript to parse

## What You Control

### Image Loading: Lazy vs Eager

In the Image component settings:

| Setting   | Use When                                            |
| --------- | --------------------------------------------------- |
| **Eager** | Above-the-fold images (hero, logo). Improves LCP.   |
| **Lazy**  | Below-the-fold images. Defers loading until needed. |

{% hint style="info" %}
Set your hero image and logo to **eager**. Everything else can be **lazy**.
{% endhint %}

### Font Loading

Upload fonts directly to Webstudio instead of using external services like Google Fonts.

**Why it matters:**

- Eliminates third-party requests
- No additional SSL/TLS handshake to external domains
- Fonts load from the same edge location as your site
- No render-blocking external stylesheets
- No third-party tracking (Google Fonts logs visitor IP addresses)

See [How to Use Custom Fonts](../how-tos/how-to-use-custom-fonts.md) for setup instructions.

{% hint style="danger" %}
**Common font mistakes:**

- **Large font files** – Use `.woff2` format for best compression
- **Too many font weights** – Only upload weights you actually use (e.g., 400 and 700, not 100-900)
- **Unused fonts** – Uploaded fonts are prefetched even if not used on the page. Delete fonts you don't need from assets.
- **Too many font families** – Each family adds load time. Stick to 1-2 families.
  {% endhint %}

#### Subsetting Fonts (Removing Unused Characters)

Most fonts include characters for multiple languages (Latin, Cyrillic, Greek, Vietnamese, etc.). If your site only uses Latin characters, you can dramatically reduce font file size by downloading a subsetted version.

**Using Google Fonts API to get Latin-only fonts:**

1. Go to [Google Fonts](https://fonts.google.com/) and select your font
2. Modify the embed URL to request only Latin characters:

```
https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap&subset=latin
```

3. Open that URL in your browser – it returns CSS with links to `.woff2` files
4. Download those `.woff2` files and upload them to Webstudio

**Example size reduction:**

| Font           | Full   | Latin-only |
| -------------- | ------ | ---------- |
| Inter Regular  | ~100KB | ~20KB      |
| Roboto Regular | ~150KB | ~25KB      |

{% hint style="info" %}
For even smaller files, use the `text=` parameter to include only specific characters:
`https://fonts.googleapis.com/css2?family=Inter&text=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789`
{% endhint %}

**Alternative tools for subsetting:**

- [glyphhanger](https://github.com/zachleat/glyphhanger) – Subset fonts based on actual characters used on your site
- [FontSquirrel Webfont Generator](https://www.fontsquirrel.com/tools/webfont-generator) – Upload a font and select subsets
- [Transfonter](https://transfonter.org/) – Online font converter with subsetting options

### Third-Party Scripts

Add scripts in [Project settings](project-settings.md) or [Head Slot](../core-components/head-slot.md).

**Always use `defer` or `async`** to prevent render-blocking:

| Attribute       | Behavior                                                                            | Use When                                             |
| --------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `defer`         | Downloads during HTML parsing, executes after parsing completes, maintains order    | Most scripts (analytics, widgets, libraries)         |
| `async`         | Downloads during HTML parsing, executes immediately when ready, no guaranteed order | Independent scripts that don't rely on other scripts |
| `type="module"` | Automatically deferred                                                              | ES modules                                           |
| _(none)_        | Blocks HTML parsing until downloaded and executed                                   | ❌ Avoid unless absolutely necessary                 |

{% hint style="info" %}
When in doubt, use `defer`. It's safer than `async` because scripts execute in order.
{% endhint %}

**Best practices:**

- **Always add `defer`** – Never add scripts without `defer` or `async`
- **Minimize third-party dependencies** – Each external script adds latency
- **Load scripts from fast CDNs** – Use well-known CDNs that are likely already cached

## Measuring Performance

### Lighthouse

Run Lighthouse in Chrome DevTools (F12 → Lighthouse tab) or use [PageSpeed Insights](https://pagespeed.web.dev/).

**Key metrics:**

| Metric                             | Target  | What It Measures              |
| ---------------------------------- | ------- | ----------------------------- |
| **LCP** (Largest Contentful Paint) | < 2.5s  | When main content is visible  |
| **FID** (First Input Delay)        | < 100ms | Responsiveness to interaction |
| **CLS** (Cumulative Layout Shift)  | < 0.1   | Visual stability              |
| **FCP** (First Contentful Paint)   | < 1.8s  | When first content appears    |
| **TTFB** (Time to First Byte)      | < 800ms | Server response time          |

### Common Issues and Fixes

| Issue                     | Cause                        | Fix                                                          |
| ------------------------- | ---------------------------- | ------------------------------------------------------------ |
| Poor LCP                  | Hero image loads slowly      | Set image to eager, ensure it's not unnecessarily large      |
| High CLS                  | Images without dimensions    | Webstudio sets dimensions automatically; check custom embeds |
| Slow TTFB                 | Heavy API calls on page load | Optimize CMS queries, reduce API calls                       |
| Render-blocking resources | External fonts or scripts    | Use uploaded fonts, defer scripts                            |

## CMS Performance

When fetching data from external APIs:

- **Minimize API calls per page** – Combine requests where possible
- **Use caching** – Configure your CMS for appropriate cache headers
- **Avoid synchronous chains** – Multiple dependent API calls slow page load

See [CMS](cms.md) for configuration details.

## Self-Hosted Performance

When [self-hosting](../self-hosting/README.md), performance depends on your hosting provider. Webstudio Cloud uses Cloudflare's global edge network; self-hosted deployments may have different characteristics.

For optimal self-hosted performance:

- Choose a hosting provider with edge locations (Vercel, Netlify, Cloudflare Pages)
- Enable caching
- Use a CDN for assets

## Related

- [Image](../core-components/image.md) – Image component settings
- [How to Use Custom Fonts](../how-tos/how-to-use-custom-fonts.md) – Font upload guide
- [SEO settings](seo-settings.md) – Related optimization settings
- [CMS](cms.md) – External data fetching
- [Cloudflare Website Builder](https://webstudio.is/cloudflare-website-builder) – How Webstudio uses Cloudflare
