import { BoxIcon } from "@webstudio-is/icons/svg";
import type {
  WsComponentMeta,
  WsComponentPropsMeta,
  PresetStyle,
} from "@webstudio-is/react-sdk";
import { props } from "./__generated__/success-message.props";
import { div } from "@webstudio-is/react-sdk/css-normalize";

const presetStyle = {
  div,
} satisfies PresetStyle<"div">;

export const meta: WsComponentMeta = {
  type: "container",
  label: "Success Message",
  icon: BoxIcon,
  presetStyle,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: [],
};
