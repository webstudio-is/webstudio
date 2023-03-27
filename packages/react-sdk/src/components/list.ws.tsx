import { ListIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import { props } from "./__generated__/list.props";

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
  category: "typography",
  type: "container",
  label: "List",
  Icon: ListIcon,
  presetStyle,
  children: [],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["ordered", "type", "starts", "reversed"],
};
