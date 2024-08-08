import type { PropMeta } from "@webstudio-is/react-sdk";

export const props: Record<string, PropMeta> = {
  className: { required: false, control: "text", type: "string" },
  code: { required: true, control: "text", type: "string" },
};
