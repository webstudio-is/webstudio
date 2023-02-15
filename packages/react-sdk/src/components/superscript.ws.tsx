import { SuperscriptIcon } from "@webstudio-is/icons";
import { type WsComponentMeta, MetaProps } from "./component-type";
import props from "./__generated__/superscript.props.json";

const meta: WsComponentMeta = {
  type: "rich-text-child",
  label: "Superscript Text",
  Icon: SuperscriptIcon,
  props: MetaProps.parse(props),
};

export default meta;
