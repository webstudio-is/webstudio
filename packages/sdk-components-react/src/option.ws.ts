import { ItemIcon } from "@webstudio-is/icons/svg";
import {
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";

import type { defaultTag } from "./option";
import { props } from "./__generated__/option.props";

const presetStyle = {
  option: [],
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  category: "hidden",
  // @todo: requiredAncestors should be ["Select", "Optgroup", "Datalist"] but that gives unreadable error when adding Select onto Canvas
  requiredAncestors: ["Select"],
  type: "control",
  label: "Option",
  description:
    "An item within a drop-down menu that users can select as their chosen value.",
  icon: ItemIcon,
  presetStyle,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["label", "selected", "value", "label"],
};
