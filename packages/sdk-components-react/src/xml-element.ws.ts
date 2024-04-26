import { XIcon } from "@webstudio-is/icons/svg";

import {
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { div, ul } from "@webstudio-is/react-sdk/css-normalize";

// import * as tc from "./theme/tailwind-classes";

import { props } from "./__generated__/xml-element.props";

const presetStyle = {
  div: [
    ...div,
    {
      property: "color",
      value: { type: "rgb", alpha: 1, r: 36, g: 12, b: 233 },
    },
    {
      property: "lineHeight",
      value: { type: "unit", unit: "number", value: 1 },
    },
  ],
  ul: [
    ...ul,
    {
      property: "marginTop",
      value: { type: "unit", unit: "px", value: 0 },
    },
    {
      property: "marginBottom",
      value: { type: "unit", unit: "px", value: 2 },
    },
    {
      property: "paddingLeft",
      value: { type: "unit", unit: "rem", value: 1.5 },
    },
    {
      property: "lineHeight",
      value: { type: "unit", unit: "number", value: 1 },
    },
  ],
} satisfies PresetStyle<"div" | "ul">;

export const meta: WsComponentMeta = {
  category: "xml",
  order: 6,
  type: "container",
  icon: XIcon,
  stylable: false,
  description: "XmlElement",
  presetStyle,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["name"],
};
