---
description: How to fix overflowing content so the screen doesn't scroll horizontally.
icon: computer-mouse-scrollwheel
---

# Fixing overflow issues

Sometimes, the content takes up too much space, causing unintentional horizontal scroll. This frustrates users, especially on mobile, and should be remedied.

Here's a video demonstrating how to diagnose and fix it. After the video, there are detailed instructions.

{% embed url="https://vimeo.com/1031704623" %}

## Find the culprit

Toggle "Show" on each instance in the navigator until the horizontal scroll goes away.

It's best to start with the outermost wrappers, like the header, main, and footer, to see which one is causing it, then drill down to inner wrappers, like sections.

Continue going deeper into the nested instances until you find the innermost instance causing the horizontal scroll.

## Fix the culprit

There is something in the culprit causing the content to extend past the viewport boundaries.

Many styles can cause overflow, but here are some common things to look for:

| Issue                                                                                            | Solution                 |
| ------------------------------------------------------------------------------------------------ | ------------------------ |
| Fixed widths                                                                                     | Remove it or set to auto |
| Flex rows without the ability to wrap                                                            | Allow wrapping           |
| A single word like "responsibility/accountability" (note the "/" will prevent it from breaking). | Separate with a space    |
| Wide content that can't wrap                                                                     | Set overflow to auto     |

## Related

- [Anatomy of the Webstudio builder](../university/foundations/anatomy-of-the-webstudio-builder.md) – Learn the builder interface and how to navigate instances
- [Element](../university/core-components/element.md) – The fundamental building block for creating layouts
- [Layout & Flexbox](../university/foundations/layout-and-flexbox.md) – Understand how layouts work to prevent overflow
- [Responsive design](../university/foundations/responsive-design.md) – Build layouts that adapt to different screen sizes
