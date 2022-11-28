import { FontBoldIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, MetaProps } from "./component-type";
import props from "./__generated__/bold.props.json";

const meta: WsComponentMeta = {
  type: "rich-text-child",
  label: "Bold Text",
  Icon: FontBoldIcon,
  props: props as MetaProps,
};

export default meta;
