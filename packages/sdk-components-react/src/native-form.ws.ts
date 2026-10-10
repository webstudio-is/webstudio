import type { PresetStyle, WsComponentMeta } from "@webstudio-is/sdk";
import { form } from "@webstudio-is/sdk/normalize.css";
import type { defaultTag } from "./native-form";

const presetStyle = {
  form: [
    ...form,
    { property: "min-height", value: { type: "unit", unit: "px", value: 20 } },
  ],
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  label: "Form",
  htmlAttributes: "hide",
  states: [
    { label: "Success", selector: "[data-state=success]" },
    { label: "Error", selector: "[data-state=error]" },
  ],
  presetStyle,
  initialProps: ["action", "successRedirect"],
  props: {
    action: {
      type: "json",
      control: "form-action",
      label: "Action",
      required: false,
      description: "Choose up to 10 Resource actions for this Form.",
    },
    successRedirect: {
      type: "string",
      control: "url",
      label: "Success redirect",
      required: false,
      description: "Redirect visitors here after every Resource succeeds.",
    },
  },
};
