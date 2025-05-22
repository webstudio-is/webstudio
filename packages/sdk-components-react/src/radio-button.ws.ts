import { RadioCheckedIcon } from "@webstudio-is/icons/svg";
import type { WsComponentMeta, PresetStyle } from "@webstudio-is/sdk";
import type { defaultTag } from "./radio-button";
import { radio } from "@webstudio-is/sdk/normalize.css";
import { props } from "./__generated__/radio-button.props";

const presetStyle = {
  input: [
    ...radio,
    {
      property: "margin-right",
      value: { type: "unit", unit: "em", value: 0.5 },
    },
  ],
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  label: "Radio",
  icon: RadioCheckedIcon,
  presetStyle,
  initialProps: ["id", "class", "name", "value", "required", "checked"],
  props,
};
