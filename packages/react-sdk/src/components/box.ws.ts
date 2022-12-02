import { SquareIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, MetaProps } from "./component-type";
import props from "./__generated__/box.props.json";

const defaultStyle = {
  boxSizing: {
    type: "keyword",
    value: "border-box",
  },
} as const;

const meta: WsComponentMeta = {
  type: "container",
  label: "Box",
  Icon: SquareIcon,
  defaultStyle,
  props: props as MetaProps,
};

export default meta;
