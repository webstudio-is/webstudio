import { Link2Icon } from "@webstudio-is/icons";
import type { WsComponentMeta, MetaProps } from "./component-type";
import props from "./__generated__/link.props.json";

const defaultStyle = {
  minHeight: {
    type: "unit",
    unit: "em",
    value: 1,
  },
  display: {
    type: "keyword",
    value: "inline-block",
  },
} as const;

const meta: WsComponentMeta = {
  type: "rich-text",
  label: "Link",
  Icon: Link2Icon,
  defaultStyle,
  children: ["Link text you can edit"],
  props: props as MetaProps,
};

export default meta;
