import { FontItalicIcon } from "@webstudio-is/icons";
import type { WsComponentMeta } from "./component-type";
import { Italic } from "./italic";

const defaultStyle = {
  fontStyle: {
    type: "keyword",
    value: "italic",
  },
} as const;

const meta: WsComponentMeta<typeof Italic> = {
  type: "rich-text-child",
  label: "Italic Text",
  Icon: FontItalicIcon,
  Component: Italic,
  defaultStyle,
};

export default meta;
