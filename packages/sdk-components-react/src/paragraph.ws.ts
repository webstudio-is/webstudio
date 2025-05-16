import { TextAlignLeftIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
} from "@webstudio-is/sdk";
import { p } from "@webstudio-is/sdk/normalize.css";
import type { defaultTag } from "./paragraph";
import { props } from "./__generated__/paragraph.props";

const presetStyle = {
  p,
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  placeholder: "Paragraph",
  icon: TextAlignLeftIcon,
  states: defaultStates,
  presetStyle,
  initialProps: ["id", "class"],
  props,
};
