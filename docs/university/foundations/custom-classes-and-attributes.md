---
description: >-
  custom classes, IDs, and data attributes allow you to target elements with custom code, animation libraries, and external scripts.
icon: code
---

# Custom classes and attributes

While [Design tokens](design-tokens.md) handle styling in Webstudio, custom classes, IDs, and data attributes serve a different purpose: they allow external code to target specific elements.

{% embed url="https://www.youtube.com/watch?v=_1QSWHOtk08" %}

## When to use what

| Feature             | Purpose                                       | Output in HTML                              |
| ------------------- | --------------------------------------------- | ------------------------------------------- |
| **Design tokens**   | Apply and manage styles                       | Converted to optimized classes (atomic CSS) |
| **Custom classes**  | Target elements with custom code              | Yes, exactly as specified                   |
| **Custom IDs**      | Unique element targeting, anchor links        | Yes, exactly as specified                   |
| **Data attributes** | Pass data to JavaScript, custom functionality | Yes, exactly as specified                   |

{% hint style="info" %}
**Important:** Design tokens do NOT output their names as classes in HTML. The token name is an internal reference – the actual CSS output is optimized for performance. Use custom classes when you need a specific class name in the HTML.
{% endhint %}

## Adding custom classes

1. Select an instance in the canvas
2. Open the **Settings** panel (right side)
3. Find the **Class** field
4. Enter your class name(s), separated by spaces

<figure><img src="../../.gitbook/assets/custom-attributes.png" alt="Settings panel showing Class, ID, and data attribute fields"><figcaption><p>Custom classes, IDs, and data attributes in the Settings panel</p></figcaption></figure>

Multiple classes can be added: `card featured animate-on-scroll`

### Use cases for custom classes

- **Animation libraries**: GSAP, AOS, or other libraries that target elements by class
- **Third-party scripts**: Analytics, heatmaps, or widgets that need class selectors
- **Custom CSS**: When adding CSS via HTML Embed or external stylesheets
- **JavaScript targeting**: `document.querySelectorAll('.my-class')`

## Adding custom IDs

1. Select an instance
2. Open **Settings**
3. Find the **ID** field
4. Enter a unique identifier (no spaces, no `#`)

### Use cases for custom IDs

- **Anchor links**: Link to `#section-name` to scroll to that section
- **JavaScript targeting**: `document.getElementById('my-element')`
- **Form labels**: Connect labels to inputs with matching IDs
- **Table of contents**: Auto-generate TOC based on heading IDs

{% hint style="warning" %}
IDs must be unique on a page. Using the same ID multiple times can cause unexpected behavior.
{% endhint %}

## Adding data attributes

Data attributes let you attach custom data to elements:

1. Select an instance
2. Open **Settings**
3. Scroll to custom properties or use the **+** to add properties
4. Add attributes like `data-speed="0.5"` or `data-section="hero"`

### Use cases for Data attributes

- **Animation parameters**: `data-speed`, `data-delay`, `data-direction`
- **Configuration**: Pass settings to JavaScript components
- **State tracking**: `data-active="true"`, `data-expanded="false"`
- **Analytics**: `data-track="cta-button"`, `data-category="signup"`

## Tokens vs classes: technical details

Design tokens in Webstudio use **atomic CSS** by default, which:

- Generates optimized, single-purpose classes
- Reduces CSS file size by up to 90%
- Improves caching and performance

This means a Token named "card" might output as multiple atomic classes like `a1 b2 c3` rather than a single `.card` class.

**If you need the exact class name in HTML** (for external scripts), use the custom Class field in Settings – not Tokens.

## Example: Integrating with GSAP

To animate elements with GSAP:

1. Add a custom class to target elements: `gsap-fade-in`
2. Add an HTML Embed with your GSAP script:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
<script>
  gsap.from(".gsap-fade-in", {
    opacity: 0,
    y: 50,
    duration: 1,
    stagger: 0.2,
  });
</script>
```

## Example: Scroll spy navigation

Create a scroll spy that highlights the current section:

1. Add IDs to each section: `about`, `services`, `contact`
2. Add `data-nav-item` to corresponding nav links
3. Use JavaScript to detect scroll position and toggle active states

## Related

- [Design tokens](design-tokens.md) – For styling elements
- [HTML Embed](../core-components/html-embed.md) – For adding custom scripts
- [Expression editor](expression-editor.md) – For dynamic attribute values
