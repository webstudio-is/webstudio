import type { PropMeta } from "@webstudio-is/sdk";

export const props: Record<string, PropMeta> = {
  charWindow: { required: true, control: "number", type: "number" },
  easing: {
    required: true,
    control: "select",
    type: "string",
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
