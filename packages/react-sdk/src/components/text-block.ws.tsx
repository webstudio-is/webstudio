import { TextIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, MetaProps } from "./component-type";
import props from "./__generated__/text-block.props.json";

const defaultStyle = {
  minHeight: {
    type: "unit",
    unit: "em",
    value: 1,
  },
} as const;

const meta: WsComponentMeta = {
  type: "rich-text",
  label: "Text Block",
  Icon: TextIcon,
  defaultStyle,
  children: ["Block of text you can edit"],
  props: props as MetaProps,
};

export default meta;
