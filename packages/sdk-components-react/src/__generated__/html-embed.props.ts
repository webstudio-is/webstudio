import type { PropMeta } from "@webstudio-is/sdk";

export const props: Record<string, PropMeta> = {
  className: {
    required: false,
    control: "text",
    type: "string",
    description: "Classes to which the element belongs",
  },
  clientOnly: { required: false, control: "boolean", type: "boolean" },
  code: { required: true, control: "text", type: "string" },
  executeScriptOnCanvas: {
    required: false,
    control: "boolean",
    type: "boolean",
  },
};
