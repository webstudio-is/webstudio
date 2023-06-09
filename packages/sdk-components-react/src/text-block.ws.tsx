import { TextBlockIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { div } from "@webstudio-is/react-sdk/css-normalize";
import { props } from "./__generated__/text-block.props";
import type { defaultTag } from "./text-block";

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
  category: "text",
  type: "container",
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
  order: 0,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["tag"],
};
