import type { PresetStyle, WsComponentMeta } from "@webstudio-is/sdk";
import { input } from "@webstudio-is/sdk/normalize.css";
import { props } from "./__generated__/input.props";

const presetStyle = {
  input: [
    ...input,
    {
      property: "display",
      value: { type: "keyword", value: "block" },
    },
  ],
} satisfies PresetStyle<"input">;

export const meta: WsComponentMeta = {
  label: "Text Input",
  presetStyle,
  initialProps: [
    "id",
    "class",
    "name",
    "value",
    "type",
    "placeholder",
    "required",
    "autofocus",
  ],
  props,
};
