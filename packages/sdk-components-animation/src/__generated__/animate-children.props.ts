import type { PropMeta } from "@webstudio-is/sdk";

export const props: Record<string, PropMeta> = {
  debug: {
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: false,
  },
};
