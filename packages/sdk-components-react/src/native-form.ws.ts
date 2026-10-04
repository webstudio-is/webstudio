import type { PresetStyle, WsComponentMeta } from "@webstudio-is/sdk";
import { form } from "@webstudio-is/sdk/normalize.css";
import type { defaultTag } from "./native-form";
import { props } from "./__generated__/form.props";

const presetStyle = {
  form: [
    ...form,
    { property: "min-height", value: { type: "unit", unit: "px", value: 20 } },
  ],
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  label: "Form",
  states: [
    { label: "Success", selector: "[data-state=success]" },
    { label: "Error", selector: "[data-state=error]" },
  ],
  presetStyle,
  initialProps: ["id", "class", "submission", "successRedirect"],
  props: {
    ...props,
    submission: {
      type: "json",
      control: "form-submission",
      required: false,
      description: "Choose up to 5 Resource destinations for this Form.",
    },
    successRedirect: {
      type: "string",
      control: "url",
      required: false,
      description: "Redirect visitors here after every Resource succeeds.",
    },
  },
};
