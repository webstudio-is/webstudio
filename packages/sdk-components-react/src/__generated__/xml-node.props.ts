import type { PropMeta } from "@webstudio-is/sdk";

export const props: Record<string, PropMeta> = {
  href: {
    required: false,
    control: "text",
    type: "string",
    description: "Document base URL",
  },
  hreflang: {
    required: false,
    control: "text",
    type: "string",
    description: "Language of the linked resource",
  },
  rel: {
    required: false,
    control: "text",
    type: "string",
    description:
      "Relationship between the location in the document containing the hyperlink and the destination resource",
  },
  tag: { required: false, control: "text", type: "string", defaultValue: "" },
  xmlns: { required: false, control: "text", type: "string" },
  "xmlns:xhtml": { required: false, control: "text", type: "string" },
};
