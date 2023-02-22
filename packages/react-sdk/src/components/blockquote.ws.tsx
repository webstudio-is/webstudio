import { BlockquoteIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-type";
import props from "./__generated__/blockquote.props.json";

const presetStyle = {
  margin: {
    type: "keyword",
    value: "0",
  },
  marginBottom: {
    type: "keyword",
    value: "10px",
  },
  paddingTop: {
    type: "keyword",
    value: "10px",
  },
  paddingBottom: {
    type: "keyword",
    value: "10px",
  },
  paddingLeft: {
    type: "keyword",
    value: "20px",
  },
  paddingRight: {
    type: "keyword",
    value: "20px",
  },
  borderLeftWidth: {
    type: "keyword",
    value: "5px",
  },
  borderLeftStyle: {
    type: "keyword",
    value: "solid",
  },
  borderLeftColor: {
    type: "keyword",
    value: "#e2e2e2",
  },
} as const;

export const meta: WsComponentMeta = {
  type: "rich-text",
  label: "Blockquote",
  Icon: BlockquoteIcon,
  presetStyle,
  children: ["Blockquote you can edit"],
};

export const propsMeta = {
  props,
  initialProps: ["tag"],
} as WsComponentPropsMeta;
