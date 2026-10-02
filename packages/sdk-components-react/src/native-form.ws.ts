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
  presetStyle,
  initialProps: ["id", "class", "submission", "action", "method", "encType"],
  props: {
    ...props,
    submission: {
      type: "json",
      control: "form-submission",
      required: false,
      description: "Choose native browser submission or Resource destinations.",
    },
  },
};
