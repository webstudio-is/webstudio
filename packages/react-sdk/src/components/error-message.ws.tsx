import { BoxIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import { props } from "./__generated__/error-message.props";
import type { Style } from "@webstudio-is/css-data";
import { div } from "../css/normalize";

const presetStyle = {
  div,
} as const satisfies Record<"div", Style>;

export const meta: WsComponentMeta = {
  type: "container",
  label: "Error Message",
  Icon: BoxIcon,
  presetStyle,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: [],
};
