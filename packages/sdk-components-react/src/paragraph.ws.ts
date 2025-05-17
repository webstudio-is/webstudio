import { TextAlignLeftIcon } from "@webstudio-is/icons/svg";
import { defaultStates, type WsComponentMeta } from "@webstudio-is/sdk";
import { p } from "@webstudio-is/sdk/normalize.css";
import { props } from "./__generated__/paragraph.props";

export const meta: WsComponentMeta = {
  icon: TextAlignLeftIcon,
  states: defaultStates,
  presetStyle: { p },
  initialProps: ["id", "class"],
  props,
};
