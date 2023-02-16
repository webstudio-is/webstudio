import { FontItalicIcon } from "@webstudio-is/icons";
import { type WsComponentMeta, WsComponentPropsMeta } from "./component-type";
import props from "./__generated__/italic.props.json";

const presetStyle = {
  fontStyle: {
    type: "keyword",
    value: "italic",
  },
} as const;

export const meta: WsComponentMeta = {
  type: "rich-text-child",
  label: "Italic Text",
  Icon: FontItalicIcon,
  presetStyle,
};

export const propsMeta = WsComponentPropsMeta.parse({
  props,
});
