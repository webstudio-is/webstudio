import { ListItemIcon } from "@webstudio-is/icons/svg";
import { defaultStates, type WsComponentMeta } from "@webstudio-is/sdk";
import { li } from "@webstudio-is/sdk/normalize.css";
import { props } from "./__generated__/list-item.props";

export const meta: WsComponentMeta = {
  icon: ListItemIcon,
  states: defaultStates,
  presetStyle: { li },
  initialProps: ["id", "class"],
  props,
};
