import type { PropMeta } from "@webstudio-is/sdk";

export const props: Record<string, PropMeta> = {
  optimize: {
    description: "Optimize the image for enhanced performance.",
    required: false,
    control: "boolean",
    type: "boolean",
  },
  quality: { required: false, control: "number", type: "number" },
};
