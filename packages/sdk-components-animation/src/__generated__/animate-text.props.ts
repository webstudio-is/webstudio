import type { PropMeta } from "@webstudio-is/sdk";

export const props: Record<string, PropMeta> = {
  easing: {
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
    required: false,
    control: "number",
    type: "number",
    defaultValue: 5,
  },
  splitBy: {
    required: false,
    control: "select",
    type: "string",
    defaultValue: "char",
    options: ["char", "space", 'symbol "#"', 'symbol "~"'],
  },
};
