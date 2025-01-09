import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/sdk";
import { ButtonElementIcon } from "@webstudio-is/icons/svg";
import { button } from "@webstudio-is/sdk/normalize.css";
import type { defaultTag } from "./vimeo-play-button";
import { props } from "./__generated__/vimeo-play-button.props";

const presetStyle = {
  button,
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  category: "hidden",
  type: "container",
  constraints: [
    {
      relation: "ancestor",
      component: { $in: ["Vimeo", "YouTube"] },
    },
    {
      relation: "ancestor",
      component: { $neq: "Button" },
    },
  ],
  label: "Play Button",
  icon: ButtonElementIcon,
  presetStyle,
  states: defaultStates,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["id", "className"],
};
