import { TextAlignLeftIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { p } from "@webstudio-is/sdk/normalize.css";
import type { defaultTag } from "./paragraph";
import { props } from "./__generated__/paragraph.props";

const presetStyle = {
  p,
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  category: "text",
  type: "container",
  description: "A container for multi-line text.",
  icon: TextAlignLeftIcon,
  constraints: {
    relation: "ancestor",
    component: { $neq: "Paragraph" },
  },
  states: defaultStates,
  presetStyle,
  order: 2,
  template: [
    {
      type: "instance",
      component: "Paragraph",
      children: [
        {
          type: "text",
          value: "Paragraph text you can edit",
          placeholder: true,
        },
      ],
    },
  ],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["id", "className"],
};
