---
description: >-
  Content Embed allows styling HTML, which can be provided via the Code property
  statically or loaded dynamically from any Resource, for example, from a CMS.
---

# 🪜 Content Embed

<div align="left">

<figure><img src="../../.gitbook/assets/content-embed-component.png" alt="Content Embed Component"><figcaption></figcaption></figure>

</div>

## Why Content Embed is needed

When designing most components on the site, you click on them and style them. However, this can’t be the case for HTML code because the HTML component is all that can be clicked on, not any of the headers, paragraphs, or other tags within.

Content Embed enables applying styles to the various tags contained within HTML.

## How to use Content Embed

Content Embed is located in Components > Data.

### 1. Add HTML

Once added to the canvas, the right panel will show a Code field. You can either add HTML directly to it or, more commonly, bind HTML to it from a Resource.

<figure><img src="../../.gitbook/assets/content-embed-code.png" alt="HTML bound to Content Embed component"><figcaption><p>CMS data bound to Content Embed Code</p></figcaption></figure>

### 2. Style

In the Navigator, Content Embed has various HTML tags nested. Expand Content Embed, and you’ll see tags such as Heading 1, Link, Image, and much more.
{% hint style="info" %}
Links inside Content Embed are represented by the **Rich Text Link** sub-component, which behaves like the [Link component](link.md). Select it in the Navigator to style all links within the embedded HTML.
{% endhint %}
<figure><img src="../../.gitbook/assets/content-embed-style.png" alt="Content Embed H2 styled"><figcaption><p>Heading 2 selected and styled</p></figcaption></figure>

Styles applied to each of these tags will apply to all occurrences of that tag within the Content Embed. For example, if you apply a border on the Image tag, then all images contained within the HTML will have a border.

## Image handling

Webstudio does NOT optimize images contained in the markup.

On the other hand, images bound to the [Image Component](image.md) are [optimized by default](image.md#optimize).

The difference is in markup, we are not mapping every element to a Webstudio Component; rather, the element is served as-is with the exception of your custom styles applied to it.

## HTML Embed vs. Content Embed

While very similar, there is one distinct difference: Content Embed enables styling the contained HTML.

If there is no need to apply styles to the contained HTML, then use the [HTML Embed Component](html-embed.md). However, if you need to style the contents (which is typically the case if fetching HTML from a CMS), then use Content Embed.

## Similar components

{% content-ref url="html-embed.md" %}
[html-embed.md](html-embed.md)
{% endcontent-ref %}

{% content-ref url="markdown-embed.md" %}
[markdown-embed.md](markdown-embed.md)
{% endcontent-ref %}

## Related

- [Markdown Embed](markdown-embed.md) – Render markdown content
- [Collection](collection.md) – Loop through CMS data
- [HTML Embed](html-embed.md) – Embed custom HTML
