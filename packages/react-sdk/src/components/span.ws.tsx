import type { Style } from "@webstudio-is/css-data";
import { PaintBrushIcon } from "@webstudio-is/icons";
import { span } from "../css/normalize";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import type { defaultTag } from "./span";
import { props } from "./__generated__/span.props";

const presetStyle = {
  span,
} as const satisfies Record<typeof defaultTag, Style>;

export const meta: WsComponentMeta = {
  type: "rich-text-child",
  label: "Styled Text",
  Icon: PaintBrushIcon,
  presetStyle,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
};
