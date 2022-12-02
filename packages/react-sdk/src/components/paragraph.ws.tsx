import { TextAlignLeftIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, MetaProps } from "./component-type";
import props from "./__generated__/paragraph.props.json";

const meta: WsComponentMeta = {
  type: "rich-text",
  label: "Paragraph",
  Icon: TextAlignLeftIcon,
  children: ["Pragraph you can edit"],
  props: props as MetaProps,
};

export default meta;
