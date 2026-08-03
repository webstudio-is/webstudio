---
description: Scroll-Driven animations are currently the main focus of Webstudio animations.
icon: arrow-up-big-small
---

# Animations

The Webstudio Animation Engine is a powerful, performant, and highly customizable system built on the [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API), with lightweight [polyfills](https://developer.mozilla.org/en-US/docs/Glossary/Polyfill) to ensure broad browser compatibility. It empowers designers and developers to create sophisticated animations with ease, offering scalability and flexibility for projects of any complexity. Whether you're animating simple transitions or orchestrating intricate, multi-layered effects, this engine provides the tools to bring your vision to life. \
\
If you want to learn the lower-level technical foundation behind Scroll-Driven animations, check out [https://scroll-driven-animations.style/](https://scroll-driven-animations.style/).

## Core Features

- **Extreme Performance** – Optimized for smooth playback, even with complex animations and large-scale projects.
- **Scalability** – Seamlessly handles everything from single-element transitions to nested, multi-group sequences.
- **Full Customization** – Animate any CSS property and stack unlimited Animation Groups for intricate effects.
- **Cross-Browser Support** – Built on the Web Animations API with polyfills to ensure consistent behavior across browsers.

## Key Components

The engine’s user interface is composed of three main components, each designed to work together for a cohesive animation workflow:

1. [**Animation Group**](../core-components/animation-group.md) – The cornerstone of the system, Animation Groups serve as containers that define how their contents animate. They support two trigger types—view-based (scrollport entry/exit) and scroll-based (scroll position)—and offer extensive configuration options like axis, scroll source, insets, and debug tools. You can nest Animation Groups infinitely to craft complex, layered animations.
2. [**Text Animation**](../core-components/text-animation.md) – Simplifies animating text by automatically splitting it into individual words or characters, allowing for dynamic effects without manual wrapping.
3. [**Video Animation**](../core-components/video-animation.md) - allows video playback when video enters the scrollport.
4. [**Stagger Animation**](../core-components/stagger-animation.md) – Creates a cascading effect by animating child elements sequentially.

## Animation Tutorials

Learn the fundamentals and advanced techniques:

| Tutorial                                                                     | Description                                  |
| ---------------------------------------------------------------------------- | -------------------------------------------- |
| [Scroll Animations 101](https://www.youtube.com/watch?v=vleipSDU_Xo)         | Introduction to scroll-driven animations     |
| [Parallax Animation 101](https://www.youtube.com/watch?v=Hzdnlz67nvQ)        | Create depth with parallax scrolling effects |
| [Fade in Animation 101](https://www.youtube.com/watch?v=ZDxwKJ_yh0A)         | Basic fade-in effects on scroll              |
| [Hero Page Load Animation](https://www.youtube.com/watch?v=RDQLbUqarUM)      | Animate hero sections on page load           |
| [Stagger Animations](https://www.youtube.com/watch?v=8y2n8qEkv94)            | Create cascading animation sequences         |
| [Animation Subject Options](https://www.youtube.com/watch?v=QQLNIeUQxPI)     | Understanding animation subjects and options |
| [Advanced Scroll Animation](https://www.youtube.com/watch?v=h8dhdb6bmWw)     | Complex scroll-driven animation techniques   |
| [Scroll-Driven Text Animations](https://www.youtube.com/watch?v=UM8WNeqWWqM) | Animate text as users scroll                 |
| [Perfecting Animation Ranges](https://www.youtube.com/watch?v=c_ObDvsYOnk)   | Fine-tune start/end points                   |

## Hover Animations

For interactive effects like hover animations, Webstudio leverages [CSS variables](css-variables.md) with a "parent interaction modifies children" approach. Define hover states on a parent element, then use CSS variables to adjust child element properties dynamically. For more information, see [CSS variables – Parent-child interactions](css-variables.md#parent-child-interactions).

## CSS Transitions

For simple state-based animations (hover effects, button interactions), use CSS Transitions in the Style Panel's Advanced section.

1. Select an instance
2. Open the **Advanced** section in the Style Panel
3. Add a `transition` property with values like `all 0.3s ease` or target specific properties like `background-color 0.2s, transform 0.3s`
4. Define the hover/focus states with changed values
5. The browser will animate smoothly between states

CSS Transitions work best for:

- Button hover effects
- Link underlines
- Color changes
- Simple transforms (scale, rotate)

For complex, multi-step animations or scroll-driven effects, use the Animation Group component instead.

---

The Webstudio Animation Engine is designed to make animations accessible yet powerful, bridging the gap between simplicity and sophistication. Whether you’re building subtle scroll-driven effects or elaborate interactive sequences, it delivers the performance and versatility to match your ambition.
## Related

- [Scroll-Driven Animations](https://webstudio.is/scroll-driven-animations) – Learn more about scroll-driven animations in Webstudio
- [Animation Group](../core-components/animation-group.md) – Container for scroll-driven animations
- [Text Animation](../core-components/text-animation.md) – Animate text by words or characters
- [Stagger Animation](../core-components/stagger-animation.md) – Create cascading animation effects
- [Video Animation](../core-components/video-animation.md) – Control video playback on scroll
- [Transforms](transforms.md) – Rotate, scale, skew, and translate elements