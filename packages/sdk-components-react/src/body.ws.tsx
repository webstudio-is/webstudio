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
      property: "WebkitFontSmoothing",
      value: { type: "keyword", value: "antialiased" },
    },
    {
      property: "MozOsxFontSmoothing",
      value: { type: "keyword", value: "grayscale" },
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
  initialProps: ["id"],
};
