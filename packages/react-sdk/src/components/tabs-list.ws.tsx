import { BoxIcon } from "@webstudio-is/icons/svg";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import { props } from "./__generated__/tabs-list.props";
import type { Style } from "@webstudio-is/css-data";
import { div } from "../css/normalize";
import type { defaultTag } from "./tabs-list";

const presetStyle = {
  div,
} as const satisfies Record<typeof defaultTag, Style>;

export const meta: WsComponentMeta = {
  type: "container",
  label: "Tabs List",
  icon: BoxIcon,
  presetStyle,
  states: [
    { selector: "[data-orientation=vertical]", label: "Vertical orientation" },
    {
      selector: "[data-orientation=horizontal]",
      label: "Horizontal orientation",
    },
  ],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["loop"],
};
