import { ListIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import { props } from "./__generated__/list.props";
import type { ListTag } from "./list";
import type { Style } from "@webstudio-is/css-data";
import { ol, ul } from "../css/normalize";

const presetStyle = {
  ol: {
    ...ol,
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
  },
  ul: {
    ...ul,
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
  },
} as const satisfies Record<ListTag, Style>;

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
