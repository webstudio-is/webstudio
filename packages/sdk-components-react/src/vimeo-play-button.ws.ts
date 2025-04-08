import {
  defaultStates,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/sdk";
import { ButtonElementIcon } from "@webstudio-is/icons/svg";
import { button } from "@webstudio-is/sdk/normalize.css";
import { props } from "./__generated__/vimeo-play-button.props";

export const meta: WsComponentMeta = {
  category: "hidden",
  type: "container",
  label: "Play Button",
  icon: ButtonElementIcon,
  states: defaultStates,
  contentModel: {
    category: "none",
    children: ["instance"],
  },
  presetStyle: {
    button,
  },
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["id", "className"],
};
