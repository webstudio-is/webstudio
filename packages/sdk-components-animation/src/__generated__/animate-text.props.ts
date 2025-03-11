import type { PropMeta } from "@webstudio-is/sdk";

export const props: Record<string, PropMeta> = {
  charWindow: {
    required: false,
    control: "number",
    type: "number",
    defaultValue: 5,
  },
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
};
