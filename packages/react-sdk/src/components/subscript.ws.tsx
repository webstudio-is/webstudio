import { SubscriptIcon } from "@webstudio-is/icons";
import { sub } from "../css/normalize";
import type {
  PresetStyle,
  WsComponentMeta,
  WsComponentPropsMeta,
} from "./component-meta";
import type { defaultTag } from "./subscript";
import { props } from "./__generated__/subscript.props";

const presetStyle = {
  sub,
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  type: "rich-text-child",
  label: "Subscript Text",
  Icon: SubscriptIcon,
  presetStyle,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
};
