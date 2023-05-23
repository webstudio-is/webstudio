import { BoxIcon } from "@webstudio-is/icons/svg";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import { props } from "./__generated__/tabs-content.props";
import type { Style } from "@webstudio-is/css-data";
import { div } from "../css/normalize";
import { defaultTag } from "./tabs-content";

const presetStyle = {
  div,
} as const satisfies Record<typeof defaultTag, Style>;

export const meta: WsComponentMeta = {
  type: "container",
  label: "Tabs Content",
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
    { selector: "[data-orientation=vertical]", label: "Vertical orientation" },
    {
      selector: "[data-orientation=horizontal]",
      label: "Horizontal orientation",
    },
  ],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["value"],
};
