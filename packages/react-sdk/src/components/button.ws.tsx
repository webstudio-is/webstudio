import { ButtonElementIcon } from "@webstudio-is/icons";
import { button } from "../css/normalize";
import type {
  PresetStyle,
  WsComponentMeta,
  WsComponentPropsMeta,
} from "./component-meta";
import { props } from "./__generated__/button.props";
import type { defaultTag } from "./button";

const presetStyle = {
  button,
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  category: "forms",
  type: "container",
  label: "Button",
  Icon: ButtonElementIcon,
  presetStyle,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["type", "innerText", "aria-label"],
};
