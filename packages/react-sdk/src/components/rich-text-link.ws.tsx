import { Link2Icon } from "@webstudio-is/icons";
import { type WsComponentMeta, MetaProps } from "./component-type";
import props from "./__generated__/rich-text-link.props.json";

const meta: WsComponentMeta = {
  type: "rich-text-child",
  label: "Link",
  Icon: Link2Icon,
  props: MetaProps.parse(props),
};

export default meta;
