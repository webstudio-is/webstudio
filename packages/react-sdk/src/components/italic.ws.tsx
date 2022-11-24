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
  Icon: FontItalicIcon,
  Component: Italic,
  defaultStyle,
  canAcceptChildren: false,
  isContentEditable: false,
  isInlineOnly: true,
  label: "Italic Text",
  isListed: false,
};

export default meta;
