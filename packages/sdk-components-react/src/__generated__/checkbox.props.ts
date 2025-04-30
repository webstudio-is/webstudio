import type { PropMeta } from "@webstudio-is/sdk";

export const props: Record<string, PropMeta> = {
  value: {
    required: false,
    control: "text",
    type: "string",
    description:
      "Defines a default value which will be displayed in the element on pageload.",
  },
};
