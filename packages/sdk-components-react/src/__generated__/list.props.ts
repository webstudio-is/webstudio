import type { PropMeta } from "@webstudio-is/sdk";

export const props: Record<string, PropMeta> = {
  ordered: {
    description:
      "Shows numbers instead of bullets when toggled. See the “List Style Type” property under the “List Item” section in the Style panel for more options.",
    required: false,
    control: "boolean",
    type: "boolean",
    defaultValue: false,
  },
};
