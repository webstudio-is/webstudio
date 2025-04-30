import type { PropMeta } from "@webstudio-is/sdk";

export const props: Record<string, PropMeta> = {
  download: {
    required: false,
    control: "boolean",
    type: "boolean",
    description:
      "Indicates that the hyperlink is to be used for downloading a resource.",
  },
  prefetch: {
    required: false,
    control: "select",
    type: "string",
    options: ["none", "intent", "render", "viewport"],
    description:
      "Controls when and if the link prefetches the resources that the next page needs to make loading faster. “Intent” will prefetch when the link is hovered or focused. “Render” will prefetch when the link is rendered. “Viewport” will prefetch when the link is in the viewport. “None” will not prefetch.",
  },
  preventScrollReset: { required: false, control: "boolean", type: "boolean" },
  reloadDocument: { required: false, control: "boolean", type: "boolean" },
  replace: { required: false, control: "boolean", type: "boolean" },
  target: {
    required: false,
    control: "select",
    type: "string",
    options: ["_self", "_blank", "_parent", "_top"],
    description:
      "Specifies where to open the linked document (in the case of an <a> element) or where to display the response received (in the case of a <form> element)",
  },
};
