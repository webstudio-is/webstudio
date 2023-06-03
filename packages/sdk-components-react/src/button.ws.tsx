import { ButtonElementIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { button } from "@webstudio-is/react-sdk/css-normalize";
import { props } from "./__generated__/button.props";
import type { defaultTag } from "./button";

const presetStyle = {
  button,
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  category: "forms",
  type: "container",
  invalidAncestors: ["Button"],
  label: "Button",
  icon: ButtonElementIcon,
  presetStyle,
  states: [
    ...defaultStates,
    { selector: ":disabled", label: "Disabled" },
    { selector: ":enabled", label: "Enabled" },
  ],
  order: 1,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["type", "innerText", "aria-label"],
};
