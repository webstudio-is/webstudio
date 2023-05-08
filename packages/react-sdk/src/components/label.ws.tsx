import { TextBlockIcon } from "@webstudio-is/icons";
import {
  type WsComponentMeta,
  type WsComponentPropsMeta,
  type PresetStyle,
  defaultStates,
} from "./component-meta";
import { props } from "./__generated__/label.props";
import type { defaultTag } from "./label";
import { label } from "../css/normalize";

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
  Icon: TextBlockIcon,
  states: defaultStates,
  presetStyle,
  children: [{ type: "text", value: "Form Label" }],
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
