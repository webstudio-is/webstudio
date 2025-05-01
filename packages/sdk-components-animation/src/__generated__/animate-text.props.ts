import type { PropMeta } from "@webstudio-is/sdk";

export const props: Record<string, PropMeta> = {
  className: {
    required: false,
    control: "text",
    type: "string",
    description: "Classes to which the element belongs",
  },
  easing: {
    description: "Easing function applied within the sliding window.",
    required: false,
    control: "select",
    type: "string",
    defaultValue: "linear",
    options: [
      "linear",
      "easeIn",
      "easeInCubic",
      "easeInQuart",
      "easeOut",
      "easeOutCubic",
      "easeOutQuart",
      "ease",
      "easeInOutCubic",
      "easeInOutQuart",
    ],
  },
  slidingWindow: {
    description:
      "Size of the sliding window for the animation:\n- 0: Typewriter effect (no animation).\n- (0..1]: Animates one part of the text at a time.\n- (1..n]: Animates multiple parts of the text within the sliding window.",
    required: false,
    control: "number",
    type: "number",
    defaultValue: 5,
  },
  splitBy: {
    description:
      "Defines how the text is split for animation (e.g., by character, space, or symbol).",
    required: false,
    control: "select",
    type: "string",
    defaultValue: "char",
    options: ["char", "space", 'symbol "#"', 'symbol "~"'],
  },
};
