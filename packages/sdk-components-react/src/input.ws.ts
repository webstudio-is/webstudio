import type { PresetStyle, WsComponentMeta } from "@webstudio-is/sdk";
import { input } from "@webstudio-is/sdk/normalize.css";
import type { defaultTag } from "./input";
import { props } from "./__generated__/input.props";

const presetStyle = {
  input: [
    ...input,
    {
      property: "display",
      value: { type: "keyword", value: "block" },
    },
  ],
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  category: "forms",
  label: "Text Input",
  description:
    "A single-line text input for collecting string data from your users.",
  presetStyle,
  order: 3,
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
