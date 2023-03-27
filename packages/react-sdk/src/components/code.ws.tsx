import { CodeIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import { displayVarNamespace } from "./code";
import { props } from "./__generated__/code.props";

const presetStyle: WsComponentMeta["presetStyle"] = {
  display: {
    type: "var",
    value: displayVarNamespace,
    fallbacks: [
      {
        type: "keyword",
        value: "inline-block",
      },
    ],
  },
  paddingLeft: {
    type: "keyword",
    value: "0.2em",
  },
  paddingRight: {
    type: "keyword",
    value: "0.2em",
  },
  backgroundColor: {
    type: "keyword",
    value: "#eee",
  },
  fontFamily: {
    type: "keyword",
    value: "monospace",
  },
};

export const meta: WsComponentMeta = {
  category: "general",
  type: "rich-text",
  label: "Code",
  Icon: CodeIcon,
  presetStyle,
  children: ["Code you can edit"],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["inline", "lang", "meta"],
};
