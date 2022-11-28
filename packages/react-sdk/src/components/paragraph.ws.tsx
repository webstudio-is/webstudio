import { TextAlignLeftIcon } from "@webstudio-is/icons";
import type { WsComponentMeta } from "./component-type";
import { Paragraph } from "./paragraph";

const meta: WsComponentMeta<typeof Paragraph> = {
  type: "rich-text",
  label: "Paragraph",
  Icon: TextAlignLeftIcon,
  Component: Paragraph,
  children: ["Pragraph you can edit"],
};

export default meta;
