import { ListIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-type";
import props from "./__generated__/list.props.json";

const presetStyle = {
  marginTop: {
    type: "keyword",
    value: "0",
  },
  marginBottom: {
    type: "keyword",
    value: "10px",
  },
  paddingLeft: {
    type: "keyword",
    value: "40px",
  },
} as const;

export const meta: WsComponentMeta = {
  type: "container",
  label: "List",
  Icon: ListIcon,
  presetStyle,
  children: [],
};

export const propsMeta = {
  props,
  initialProps: ["ordered", "type", "starts", "reversed"],
} as WsComponentPropsMeta;
