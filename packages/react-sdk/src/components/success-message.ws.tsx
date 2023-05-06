import { BoxIcon } from "@webstudio-is/icons";
import type {
  WsComponentMeta,
  WsComponentPropsMeta,
  PresetStyle,
} from "./component-meta";
import { props } from "./__generated__/success-message.props";
import { div } from "../css/normalize";

const presetStyle = {
  div,
} satisfies PresetStyle<"div">;

export const meta: WsComponentMeta = {
  type: "container",
  label: "Success Message",
  Icon: BoxIcon,
  presetStyle,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: [],
};
