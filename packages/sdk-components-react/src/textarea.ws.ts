import type { WsComponentMeta, PresetStyle } from "@webstudio-is/sdk";
import { textarea } from "@webstudio-is/sdk/normalize.css";
import { props } from "./__generated__/textarea.props";

const presetStyle = {
  textarea: [
    ...textarea,
    // resize doesn't work well while on canvas
    { property: "resize", value: { type: "keyword", value: "none" } },
    {
      property: "display",
      value: { type: "keyword", value: "block" },
    },
  ],
} satisfies PresetStyle<"textarea">;

export const meta: WsComponentMeta = {
  label: "Text Area",
  presetStyle,
  contentModel: {
    category: "instance",
    children: [],
  },
  initialProps: [
    "id",
    "class",
    "name",
    "value",
    "placeholder",
    "required",
    "autofocus",
  ],
  props,
};
