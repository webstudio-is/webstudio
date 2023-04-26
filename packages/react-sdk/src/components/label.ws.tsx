import { TextBlockIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import { props } from "./__generated__/label.props";
import type { defaultTag } from "./label";
import type { Style } from "@webstudio-is/css-data";
import { label } from "../css/normalize";

const presetStyle = {
  label: {
    ...label,
    display: {
      type: "keyword",
      value: "block",
    },
  },
} as const satisfies Record<typeof defaultTag, Style>;

export const meta: WsComponentMeta = {
  category: "forms",
  type: "rich-text",
  label: "Label",
  Icon: TextBlockIcon,
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
