import { BrushIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, MetaProps } from "./component-type";
import props from "./__generated__/span.props.json";

const meta: WsComponentMeta = {
  type: "rich-text-child",
  label: "Styled Text",
  Icon: BrushIcon,
  props: props as MetaProps,
};

export default meta;
