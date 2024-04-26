import type { PropMeta } from "@webstudio-is/react-sdk";

export const props: Record<string, PropMeta> = {
  name: {
    required: false,
    control: "text",
    type: "string",
    defaultValue: "element",
    description:
      "This name is important when submitting form data to the server, as it identifies the data associated with the input. When multiple inputs share the same name attribute, they are treated as part of the same group (e.g., radio buttons or checkboxes).",
  },
};
