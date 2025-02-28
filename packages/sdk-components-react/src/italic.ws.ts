import { TextItalicIcon } from "@webstudio-is/icons/svg";
import type { defaultTag } from "./italic";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/sdk";
import { i } from "@webstudio-is/sdk/normalize.css";
import { props } from "./__generated__/italic.props";

const presetStyle = {
  i: [
    ...i,
    {
      property: "font-style",
      value: { type: "keyword", value: "italic" },
    },
  ],
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  type: "rich-text-child",
  label: "Italic Text",
  icon: TextItalicIcon,
  states: defaultStates,
  presetStyle,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["id", "className"],
};
