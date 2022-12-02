import { HeadingIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, MetaProps } from "./component-type";
import props from "./__generated__/heading.props.json";

const meta: WsComponentMeta = {
  type: "rich-text",
  label: "Heading",
  Icon: HeadingIcon,
  children: ["Heading you can edit"],
  props: props as MetaProps,
};

export default meta;
