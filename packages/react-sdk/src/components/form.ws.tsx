import { FormIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, MetaProps } from "./component-type";
import props from "./__generated__/form.props.json";

const presetStyle = {
  minHeight: {
    type: "unit",
    unit: "px",
    value: 20,
  },
  boxSizing: {
    type: "keyword",
    value: "border-box",
  },
} as const;

const meta: WsComponentMeta = {
  type: "container",
  label: "Form",
  Icon: FormIcon,
  presetStyle,
  props: props as MetaProps,
};

export default meta;
