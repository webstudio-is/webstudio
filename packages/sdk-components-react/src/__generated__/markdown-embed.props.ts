import type { PropMeta } from "@webstudio-is/sdk";

export const props: Record<string, PropMeta> = {
  code: { required: true, control: "text", type: "string" },
};
