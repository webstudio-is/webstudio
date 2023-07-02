import { BlockquoteIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { blockquote } from "@webstudio-is/react-sdk/css-normalize";
import type { defaultTag } from "./blockquote";
import { props } from "./__generated__/blockquote.props";

const presetStyle = {
  blockquote,
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  category: "text",
  type: "container",
  label: "Blockquote",
  icon: BlockquoteIcon,
  states: defaultStates,
  presetStyle,
  template: [
    {
      type: "instance",
      component: "Blockquote",
      children: [{ type: "text", value: "Blockquote you can edit" }],
    },
  ],
  order: 3,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
};
