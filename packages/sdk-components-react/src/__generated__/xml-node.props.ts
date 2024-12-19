import type { PropMeta } from "@webstudio-is/react-sdk";

export const props: Record<string, PropMeta> = {
  href: {
    required: false,
    control: "text",
    type: "string",
    description: "The URL of a linked resource.",
  },
  hreflang: { required: false, control: "text", type: "string" },
  rel: {
    required: false,
    control: "text",
    type: "string",
    description:
      "Specifies the relationship of the target object to the link object.",
  },
  tag: { required: false, control: "text", type: "string", defaultValue: "" },
  xmlns: { required: false, control: "text", type: "string" },
  "xmlns:xhtml": { required: false, control: "text", type: "string" },
};
