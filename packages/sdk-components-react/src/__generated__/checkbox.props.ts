import type { PropMeta } from "@webstudio-is/sdk";

export const props: Record<string, PropMeta> = {
  value: {
    required: false,
    control: "text",
    type: "string",
    description: "Value of the form control",
  },
};
