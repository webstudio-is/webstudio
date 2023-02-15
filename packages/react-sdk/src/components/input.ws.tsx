import { InputIcon } from "@webstudio-is/icons";
import { type WsComponentMeta, MetaProps } from "./component-type";
import props from "./__generated__/input.props.json";

const meta: WsComponentMeta = {
  type: "control",
  label: "Input",
  Icon: InputIcon,
  props: MetaProps.parse(props),
};

export default meta;
