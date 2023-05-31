import { TextBlockIcon } from "@webstudio-is/icons/svg";
import {
  type WsComponentMeta,
  type WsComponentPropsMeta,
  type PresetStyle,
  defaultStates,
} from "@webstudio-is/react-sdk";
import { label } from "@webstudio-is/react-sdk/css-normalize";
import { props } from "./__generated__/label.props";
import type { defaultTag } from "./label";

const presetStyle = {
  label: [
    ...label,
    { property: "display", value: { type: "keyword", value: "block" } },
  ],
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  category: "forms",
  type: "rich-text",
  label: "Input Label",
  icon: TextBlockIcon,
  states: defaultStates,
  presetStyle,
  order: 2,
  template: [
    {
      type: "instance",
      component: "Label",
      children: [{ type: "text", value: "Form Label" }],
    },
  ],
};

export const propsMeta: WsComponentPropsMeta = {
  props: {
    ...props,
    htmlFor: {
      required: false,
      control: "text",
      type: "string",
      rows: 0,
      label: "For",
    },
  },
  initialProps: ["htmlFor"],
};
