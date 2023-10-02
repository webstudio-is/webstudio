import { TextAlignLeftIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { p } from "@webstudio-is/react-sdk/css-normalize";
import type { defaultTag } from "./paragraph";
import { props } from "./__generated__/paragraph.props";

const presetStyle = {
  p,
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  category: "text",
  type: "container",
  label: "Paragraph",
  description: "A container for multi-line text.",
  icon: TextAlignLeftIcon,
  invalidAncestors: ["Paragraph"],
  states: defaultStates,
  presetStyle,
  order: 2,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["id"],
};
