import { BoxIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import { props } from "./__generated__/box.props";

const presetStyle = {
  boxSizing: {
    type: "keyword",
    value: "border-box",
  },
} as const;

export const meta: WsComponentMeta = {
  category: "general",
  type: "container",
  label: "Box",
  Icon: BoxIcon,
  presetStyle,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["tag"],
};
