---
description: Webstudio provides comprehensive SEO features.
---

# 🎯 SEO settings

{% embed url="https://youtu.be/8aNpE5JYn5g" %}

## ✅ SEO Features

- Meta title
- Meta description
- Open graph
- Semantic tags
- Image alt text
- All meta fields
- Sitemap
- Custom sitemap
- No index
- Default canonical with the ability to [customize it](../core-components/head-slot.md)
- Customizable head (global and [per page](../core-components/head-slot.md))
- Auto exclude no index from sitemap
- Robots.txt
- SSL
- 301 redirects
- 302 redirects
- Site
- WebSite structured data
- Href lang tag
- Auto image conversion (performance)
- Auto image compression (performance)
- Auto set image width and height (CLS)
- Image lazy & eager loading options (performance and LCP)
- Aria labels
- Link rel
- Favicon
- All attributes

## 🌐 Global site settings

In '[Project settings](project-settings.md)' under the Webstudio menu, you'll find essential settings for your entire project:

- **Site Name**: Used to output WebSite structured data to clearly define your website's identity.
- **Favicon**: Output your logo in search engines, browser tabs, and more.
- **Custom Header Code**: Global field to output scripts in the head. For modifying the head on a per-page basis, see [Head Slot](../core-components/head-slot.md).

These settings ensure uniformity and brand coherence across all pages of your website.

## 🔍 Individual page SEO settings

Fine-tune SEO settings for each page through the Pages panel. See [Page settings](page-settings.md) for a full reference of all available fields, including title, description, social image, custom meta tags, and more.

{% hint style="info" %}
The social image you add to your homepage will be used as the cover image for the project on the dashboard.
{% endhint %}

## 🐦 Twitter card customization

To customize how your content appears when shared on Twitter/X:

1. Go to **Page Settings → Custom Meta Tags**
2. Add a meta tag with:
   - Property: `twitter:card`
   - Content: `summary_large_image` (for large image cards)

## 🔧 Debugging social sharing

Social platforms cache sharing previews. To clear caches and test your changes:

- **Facebook**: [Sharing Debugger](https://developers.facebook.com/tools/debug/)
- **Twitter/X**: [Card Validator](https://cards-dev.twitter.com/validator)

{% hint style="info" %}
When you publish to a custom domain, staging and webstudio domains are automatically de-indexed from search engines.
{% endhint %}

## Related

- [Page settings](page-settings.md) – Per-page SEO fields: title, description, social image, custom meta tags
- [Project settings](project-settings.md) – Configure site name, favicon, and global settings
- [Head Slot](../core-components/head-slot.md) – Add custom meta tags and scripts per page
- [Publishing & custom domains](publishing-and-custom-domains.md) – Deploy your site with custom domains
- [CMS](cms.md) – Create dynamic pages with SEO-optimized content
