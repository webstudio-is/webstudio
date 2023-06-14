import { BodyIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { body } from "@webstudio-is/react-sdk/css-normalize";
import { props } from "./__generated__/body.props";
import type { defaultTag } from "./body";

const presetStyle = {
  body: [
    ...body,
    {
      property: "fontFamily",
      value: { type: "keyword", value: "Arial" },
    },
    {
      property: "fontSize",
      value: { type: "unit", unit: "px", value: 14 },
    },
    {
      property: "lineHeight",
      value: { type: "unit", unit: "number", value: 1.5 },
    },
    // temporary set root color
    // until builder start to fallback "inherit" to black
    {
      property: "color",
      value: { type: "keyword", value: "black" },
    },
  ],
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  type: "container",
  label: "Body",
  icon: BodyIcon,
  states: defaultStates,
  presetStyle,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
};
