import { SubscriptIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, MetaProps } from "./component-type";
import props from "./__generated__/subscript.props.json";

const meta: WsComponentMeta = {
  type: "rich-text-child",
  label: "Subscript Text",
  Icon: SubscriptIcon,
  props: props as MetaProps,
};

export default meta;
