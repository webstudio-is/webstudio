import type { PropMeta } from "@webstudio-is/sdk";

export const props: Record<string, PropMeta> = {
  variant: {
    required: false,
    control: "select",
    type: "string",
    defaultValue: "note",
    options: ["note", "tip", "important", "warning", "caution"],
  },
};
