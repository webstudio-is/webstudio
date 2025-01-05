import { SubscriptIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/sdk";
import { sub } from "@webstudio-is/sdk/normalize.css";
import type { defaultTag } from "./subscript";
import { props } from "./__generated__/subscript.props";

const presetStyle = {
  sub,
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  type: "rich-text-child",
  label: "Subscript Text",
  icon: SubscriptIcon,
  states: defaultStates,
  presetStyle,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["id", "className"],
};
