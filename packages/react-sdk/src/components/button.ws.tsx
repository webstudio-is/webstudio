import { ButtonIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, MetaProps } from "./component-type";
import props from "./__generated__/button.props.json";

const meta: WsComponentMeta = {
  type: "rich-text",
  label: "Button",
  Icon: ButtonIcon,
  children: ["Button text you can edit"],
  props: props as MetaProps,
};

export default meta;
