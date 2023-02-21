import { CodeIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-type";
import props from "./__generated__/heading.props.json";

const presetStyle = {
  paddingTop: {
    type: "keyword",
    value: "0.2em",
  },
  paddingBottom: {
    type: "keyword",
    value: "0.2em",
  },
  paddingLeft: {
    type: "keyword",
    value: "0.4em",
  },
  paddingRight: {
    type: "keyword",
    value: "0.4em",
  },
  margin: {
    type: "keyword",
    value: "0",
  },
  whiteSpace: {
    type: "keyword",
    value: "break-spaces",
  },
  backgroundColor: {
    type: "keyword",
    value: "#eee",
  },
  borderRadius: {
    type: "keyword",
    value: "3px",
  },
  fontFamily: {
    type: "keyword",
    value: "monospace",
  },
} as const;

export const meta: WsComponentMeta = {
  type: "rich-text",
  label: "Code",
  Icon: CodeIcon,
  presetStyle,
  children: ["Code you can edit"],
};

export const propsMeta = {
  props,
  initialProps: [],
} as WsComponentPropsMeta;
