import type { WsComponentMeta, PresetStyle } from "@webstudio-is/sdk";
import { textarea } from "@webstudio-is/sdk/normalize.css";
import type { defaultTag } from "./textarea";
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
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  category: "forms",
  label: "Text Area",
  description:
    "A multi-line text input for collecting longer string data from your users.",
  presetStyle,
  order: 4,
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
