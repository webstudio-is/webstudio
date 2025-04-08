import {
  defaultStates,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/sdk";
import { div } from "@webstudio-is/sdk/normalize.css";
import { BoxIcon } from "@webstudio-is/icons/svg";
import { props } from "./__generated__/vimeo-spinner.props";

export const meta: WsComponentMeta = {
  type: "container",
  icon: BoxIcon,
  states: defaultStates,
  category: "hidden",
  label: "Spinner",
  contentModel: {
    category: "none",
    children: ["instance"],
  },
  presetStyle: {
    div,
  },
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["id", "className"],
};
