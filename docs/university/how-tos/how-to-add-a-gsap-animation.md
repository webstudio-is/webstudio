---
description: Add GSAP animations to your Webstudio site with custom code.
---

# 🍀 How to add a GSAP animation

<figure><img src="../../.gitbook/assets/gsap.png" alt=""><figcaption></figcaption></figure>

## Embed GSAP library on the page

1. Add HTML [Embed Component](../core-components/html-embed.md) to the canvas
2. Activate "[Client Only](../core-components/html-embed.md#client-only)" setting
3. Optionally activate "[Run script on canvas](../core-components/html-embed.md#run-script-on-canvas)" setting
4. Open GSAP official [installation instruction](https://gsap.com/docs/v3/Installation)
5. Copy the scripts into HTML Embed Code in Settings

### Example

```html
<script defer src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/Flip.min.js"></script>
<script type="module">
  gsap.registerPlugin(Flip);
  gsap.fromTo(".animation", {opacity: 0}, {
    opacity: 1, 
    duration: 1, 
    stagger: 0.1, 
    ease: "power2.inOut"
  });  
</script>
```

## Q\&A

### How to reuse the animation on multiple pages?

You can reuse the animation using [Slot component](../core-components/html-embed.md#how-to-reuse-your-custom-code-across-multiple-web-pages)

### Can I use the Custom Code from project settings to include GSAP on all pages?

While you can add the library in the HEAD in project settings, this HTML won't run in preview, so you can't test inside the builder. Additionally, if you use async or defer attributes, there is no guarantee that your HTML Embed scripts on the page won't run before the library is loaded. If you don't use defer or async attributes, you will slow down your site by blocking the rendering until the library is loaded.

### Identifier 'x' has already been declared

Learn more about script scope [here](../core-components/html-embed.md#avoid-creating-global-variables).

## Demo

[Preview Link](https://simple-gsap-demo.wstd.io/)\
[Builder Link](https://apps.webstudio.is/builder/623cdb40-24bb-4809-a610-145b6eefcf21?authToken=d0544921-f4bb-4697-a0d8-2efd2a0c4a11\&mode=preview)

## Related

- [Animations](../foundations/animations.md) – Built-in animation capabilities in Webstudio
- [HTML Embed](../core-components/html-embed.md) – Add custom scripts and code to your pages
- [Project settings](../foundations/project-settings.md) – Add global scripts in the custom code section
- [Variables](../foundations/variables.md) – Use variables for dynamic animation values
