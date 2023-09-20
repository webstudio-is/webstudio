import type { PropMeta } from "@webstudio-is/react-sdk";

export const props: Record<string, PropMeta> = {
  code: { required: true, control: "text", type: "string" },
  executeScriptOnCanvas: {
    required: false,
    control: "boolean",
    type: "boolean",
  },
};
