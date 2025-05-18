import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
} from "@webstudio-is/sdk";
import { body } from "@webstudio-is/sdk/normalize.css";
import { props } from "./__generated__/body.props";
import type { defaultTag } from "./body";

const presetStyle = {
  body: [
    ...body,
    {
      property: "-webkit-font-smoothing",
      value: { type: "keyword", value: "antialiased" },
    },
    {
      property: "-moz-osx-font-smoothing",
      value: { type: "keyword", value: "grayscale" },
    },
  ],
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  states: defaultStates,
  presetStyle,
  initialProps: ["id", "class"],
  props,
};
