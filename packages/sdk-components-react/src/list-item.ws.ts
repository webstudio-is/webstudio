import { ListItemIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/sdk";
import { li } from "@webstudio-is/sdk/normalize.css";
import { props } from "./__generated__/list-item.props";

export const meta: WsComponentMeta = {
  type: "container",
  placeholder: "List item",
  icon: ListItemIcon,
  states: defaultStates,
  presetStyle: {
    li,
  },
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["id", "className"],
};
