import type { PresetStyle, WsComponentMeta } from "@webstudio-is/sdk";
import { select } from "@webstudio-is/sdk/normalize.css";
import { props } from "./__generated__/select.props";

const presetStyle = {
  select: [
    ...select,
    {
      property: "display",
      value: { type: "keyword", value: "block" },
    },
  ],
} satisfies PresetStyle<"select">;

export const meta: WsComponentMeta = {
  presetStyle,
  initialProps: [
    "id",
    "class",
    "name",
    "value",
    "multiple",
    "required",
    "autofocus",
  ],
  props,
};
