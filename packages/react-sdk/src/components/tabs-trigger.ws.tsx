import { BoxIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import { props } from "./__generated__/tabs-trigger.props";
import type { Style } from "@webstudio-is/css-data";
import { button } from "../css/normalize";
import type { defaultTag } from "./button";

const presetStyle = {
  button,
} as const satisfies Record<typeof defaultTag, Style>;

export const meta: WsComponentMeta = {
  category: "advanced",
  type: "container",
  label: "Tabs Trigger",
  Icon: BoxIcon,
  presetStyle,
  states: [
    {
      selector: "[data-state=active]",
      label: "Active",
    },
    {
      selector: "[data-state=inactive]",
      label: "Inactive",
    },
    {
      selector: "[data-disabled]",
      label: "Disabled",
    },
    { selector: "[data-orientation=vertical]", label: "Vertical orientation" },
    {
      selector: "[data-orientation=horizontal]",
      label: "Horizontal orientation",
    },
  ],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["innerText", "value", "disabled"],
};
