import type { PresetStyle, WsComponentMeta } from "@webstudio-is/sdk";
import { form } from "@webstudio-is/sdk/normalize.css";
import type { defaultTag } from "./form";
import { props } from "./__generated__/form.props";

const presetStyle = {
  form: [
    ...form,
    { property: "min-height", value: { type: "unit", unit: "px", value: 20 } },
  ],
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  label: "Form",
  description:
    "Deprecated. Use Form for Resource submissions or an Element with tag form for native browser submissions.",
  deprecated: true,
  presetStyle,
  initialProps: ["id", "class", "action"],
  props,
};
