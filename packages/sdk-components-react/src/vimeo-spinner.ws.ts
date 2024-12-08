import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { props } from "./__generated__/vimeo-spinner.props";
import { div } from "@webstudio-is/sdk/normalize.css";
import { BoxIcon } from "@webstudio-is/icons/svg";

const presetStyle = {
  div,
} satisfies PresetStyle<"div">;

export const meta: WsComponentMeta = {
  type: "container",
  constraints: {
    relation: "ancestor",
    component: { $eq: "Vimeo" },
  },
  icon: BoxIcon,
  states: defaultStates,
  presetStyle,
  category: "hidden",
  label: "Spinner",
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["id", "className"],
};
