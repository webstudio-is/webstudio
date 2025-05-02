import type { PropMeta } from "@webstudio-is/sdk";

export const props: Record<string, PropMeta> = {
  download: {
    required: false,
    control: "boolean",
    type: "boolean",
    description:
      "Whether to download the resource instead of navigating to it, and its filename if so",
  },
  prefetch: {
    required: false,
    control: "select",
    type: "string",
    options: ["none", "intent", "render", "viewport"],
  },
  preventScrollReset: { required: false, control: "boolean", type: "boolean" },
  reloadDocument: { required: false, control: "boolean", type: "boolean" },
  replace: { required: false, control: "boolean", type: "boolean" },
  target: {
    required: false,
    control: "select",
    type: "string",
    options: ["_self", "_blank", "_parent", "_top"],
    description: "Navigable for form submission",
  },
};
