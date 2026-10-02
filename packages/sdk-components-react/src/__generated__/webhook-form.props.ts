import type { PropMeta } from "@webstudio-is/sdk";

export const props: Record<string, PropMeta> = {
  state: {
    description:
      "Use this property to reveal the Success and Error states on the canvas so they can be styled. The Initial state is displayed when the page first opens. The Success and Error states are displayed depending on whether the Form submits successfully or unsuccessfully.",
    required: false,
    control: "radio",
    type: "string",
    defaultValue: "initial",
    options: ["initial", "success", "error"],
  },
};
