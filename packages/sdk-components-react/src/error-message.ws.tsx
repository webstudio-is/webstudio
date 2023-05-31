import { BoxIcon } from "@webstudio-is/icons/svg";
import type {
  WsComponentMeta,
  WsComponentPropsMeta,
  PresetStyle,
} from "@webstudio-is/react-sdk";
import { div } from "@webstudio-is/react-sdk/css-normalize";
import { props } from "./__generated__/error-message.props";

const presetStyle = {
  div,
} satisfies PresetStyle<"div">;

export const meta: WsComponentMeta = {
  type: "container",
  label: "Error Message",
  icon: BoxIcon,
  presetStyle,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: [],
};
