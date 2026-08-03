---
description: >-
  The Text Animation component simplifies animating text by automatically
  splitting it into individual words or characters, allowing for dynamic effects
  without manual wrapping.
icon: t
---

# Text Animation

Let's say you want to animate one letter at a time - instead of having to manually wrap _each_ letter in an [Animation Group](animation-group.md), you can simply wrap a text instance (like a heading) in the Text Animation component.

{% hint style="info" %}
Text Animation is one component of the animation engine. See [Animations](../foundations/animations.md) for an overview.
{% endhint %}

The Text Animation component handles splitting the text under the hood, making it easy to prepare text for animation.

{% hint style="info" %}
Just remember that you'll need to wrap the Text Animation component in an [Animation Group](animation-group.md) to define and control the actual animation behavior. The Animation Group must be the **direct** **parent** of the Text Animation.
{% endhint %}

You can split text by:

- Spaces (enabling you to animate each word)
- Characters (enabling you to animate each letter)
- `#`
- `~`

## Settings

### Split By

Defines how text is split into animated parts.

- **Characters** (`char`) – Animates one character at a time. This is the default.
- **Spaces** (`space`) – Animates one word at a time.
- **`#`** (`symbol "#"`) – Splits text at the `#` symbol.
- **`~`** (`symbol "~"`) – Splits text at the `~` symbol.

### Sliding Window

Controls how many text parts animate concurrently. The default is `5`.

- **`0`** – Creates an instant typewriter-like step between parts.
- **`(0..1]`** – Animates one text part at a time.
- **`> 1`** – Animates multiple text parts at once, creating an overlapping wave.

### Easing

Controls the easing within the sliding window. The default is `linear`. Supported values are `linear`, `easeIn`, `easeInCubic`, `easeInQuart`, `easeOut`, `easeOutCubic`, `easeOutQuart`, `ease`, `easeInOutCubic`, and `easeInOutQuart`.

## Structure

The Text Animation component must be the direct child of Animation Group. The text-containing element goes inside Text Animation. Configure word or character splitting on Text Animation, then define the actual opacity, translate, scale, or other animated styles on the parent Animation Group.

## Under the hood

Here's an example of what happens automatically under the hood.

If you wrap a heading component that outputs the following HTML:

```html
<h2>Hello World</h2>
```

in a Text Component and split the text by spaces, it will appear as:

```html
<h2>
  <span>Hello</span>
  <!-- The space is automatically ignored by the animation. -->
  <span> </span>
  <span>World</span>
</h2>
```

Now the parent Animation Group can effectively target each word individually.

## Usage notes

- Text Animation can contain Heading, Paragraph, Text, or other text-containing instances.
- The Text Animation component splits non-empty text nodes under the hood, including text inside nested instances.
- The parent Animation Group provides the actual animation styles, such as opacity, translate, scale, or rotate.
- Use the regular Style Panel to define the final readable state of the text. Use Animation Group keyframes to define the starting state for "in" animations or the ending state for "out" animations.

## Related

- [Animation Group](animation-group.md) – Required parent for animations
- [Stagger Animation](stagger-animation.md) – Stagger child animations
- [Heading](heading.md) – Headings to animate
- [Paragraph](paragraph.md) – Text to animate
