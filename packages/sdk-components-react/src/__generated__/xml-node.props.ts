import type { PropMeta } from "@webstudio-is/react-sdk";

export const props: Record<string, PropMeta> = {
  tag: { required: false, control: "text", type: "string", defaultValue: "" },
};
