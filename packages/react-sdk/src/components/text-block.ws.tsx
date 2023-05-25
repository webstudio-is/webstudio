import { TextBlockIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "./component-meta";
import { props } from "./__generated__/text-block.props";
import type { defaultTag } from "./text-block";
import { div } from "../css/normalize";

const presetStyle = {
  div: [
    ...div,
    {
      property: "minHeight",
      value: { type: "unit", unit: "em", value: 1 },
    },
  ],
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  category: "typography",
  type: "rich-text",
  label: "Text Block",
  icon: TextBlockIcon,
  states: defaultStates,
  presetStyle,
  template: [
    {
      type: "instance",
      component: "TextBlock",
      children: [{ type: "text", value: "Block of text you can edit" }],
    },
  ],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
};
