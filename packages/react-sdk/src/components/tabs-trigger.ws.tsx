import { BoxIcon } from "@webstudio-is/icons/svg";
import type {
  PresetStyle,
  WsComponentMeta,
  WsComponentPropsMeta,
} from "./component-meta";
import { props } from "./__generated__/tabs-trigger.props";
import { button } from "../css/normalize";
import type { defaultTag } from "./button";

const presetStyle = {
  button,
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  type: "container",
  label: "Tabs Trigger",
  icon: BoxIcon,
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
