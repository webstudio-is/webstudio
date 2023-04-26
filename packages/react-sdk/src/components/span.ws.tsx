import { PaintBrushIcon } from "@webstudio-is/icons";
import { span } from "../css/normalize";
import type {
  PresetStyle,
  WsComponentMeta,
  WsComponentPropsMeta,
} from "./component-meta";
import type { defaultTag } from "./span";
import { props } from "./__generated__/span.props";

const presetStyle = {
  span,
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  type: "rich-text-child",
  label: "Styled Text",
  Icon: PaintBrushIcon,
  presetStyle,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
};
