import type { PropMeta } from "@webstudio-is/react-sdk";

export const props: Record<string, PropMeta> = {
  dateStyle: {
    required: false,
    control: "radio",
    type: "string",
    defaultValue: "short",
    options: ["long", "short"],
  },
  datetime: {
    required: false,
    control: "text",
    type: "string",
    defaultValue: "dateTime attribute is not set",
  },
};
