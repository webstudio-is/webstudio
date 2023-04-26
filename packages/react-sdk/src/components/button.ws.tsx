import { ButtonElementIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import { props } from "./__generated__/button.props";
import { button } from "../css/normalize";
import type { defaultTag } from "./button";
import type { Style } from "@webstudio-is/css-data";

const presetStyle = {
  button,
} as const satisfies Record<typeof defaultTag, Style>;

export const meta: WsComponentMeta = {
  category: "forms",
  type: "container",
  label: "Button",
  Icon: ButtonElementIcon,
  presetStyle,
  states: [
    { selector: ":hover", label: "Hover" },
    { selector: ":focus", label: "Focus" },
    { selector: ":active", label: "Active" },
    { selector: ":disabled", label: "Disabled" },
    { selector: ":enabled", label: "Enabled" },
  ],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["type", "innerText", "aria-label"],
};
