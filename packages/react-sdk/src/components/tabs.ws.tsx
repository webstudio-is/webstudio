import { BoxIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import { props } from "./__generated__/tabs.props";
import type { Style } from "@webstudio-is/css-data";
import { div } from "../css/normalize";
import type { defaultTag } from "./tabs";

const presetStyle = {
  div: {
    ...div,
    display: {
      type: "keyword",
      value: "flex",
    },
    flexDirection: {
      type: "keyword",
      value: "column",
    },
  },
} as const satisfies Record<typeof defaultTag, Style>;

export const meta: WsComponentMeta = {
  category: "advanced",
  type: "container",
  label: "Tabs",
  Icon: BoxIcon,
  presetStyle,
  states: [
    { selector: "[data-orientation=vertical]", label: "Vertical orientation" },
    {
      selector: "[data-orientation=horizontal]",
      label: "Horizontal orientation",
    },
  ],
  // @todo needs TreeTemplate data structure
  children: [],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["defaultValue", "orientation", "activationMode"],
};
