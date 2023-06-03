import type { PropMeta } from "@webstudio-is/generate-arg-types";

export const props: Record<string, PropMeta> = {
  code: { required: true, control: "text", type: "string" },
  executeScriptOnCanvas: {
    required: true,
    control: "boolean",
    type: "boolean",
  },
};
