import type { PropMeta } from "@webstudio-is/sdk";

export const props: Record<string, PropMeta> = {
  code: { required: false, control: "text", type: "string" },
  language: { required: false, control: "text", type: "string" },
  theme: { required: false, control: "text", type: "string" },
};
