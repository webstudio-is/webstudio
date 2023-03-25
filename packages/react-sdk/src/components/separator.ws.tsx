import { DashIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import { props } from "./__generated__/separator.props";

const presetStyle = {
  height: {
    type: "keyword",
    value: "1px",
  },
  backgroundColor: {
    type: "keyword",
    value: "gray",
  },
  border: {
    type: "keyword",
    value: "none",
  },
} as const;

export const meta: WsComponentMeta = {
  category: "general",
  type: "embed",
  label: "Separator",
  Icon: DashIcon,
  presetStyle,
  children: [],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: [],
};
