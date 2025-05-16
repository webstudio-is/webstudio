import { LabelIcon } from "@webstudio-is/icons/svg";
import {
  type WsComponentMeta,
  type PresetStyle,
  defaultStates,
} from "@webstudio-is/sdk";
import { label } from "@webstudio-is/sdk/normalize.css";
import { props } from "./__generated__/label.props";
import type { defaultTag } from "./label";

const presetStyle = {
  label: [
    ...label,
    { property: "display", value: { type: "keyword", value: "block" } },
  ],
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  label: "Input Label",
  icon: LabelIcon,
  states: defaultStates,
  presetStyle,
  initialProps: ["id", "class", "for"],
  props,
};
