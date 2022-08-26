import { HeadingIcon } from "@webstudio-is/icons";
import type { WsComponentMeta } from "./component-type";
import { Heading } from "./heading";

const meta: WsComponentMeta<typeof Heading> = {
  Icon: HeadingIcon,
  Component: Heading,
  canAcceptChildren: false,
  isContentEditable: true,
  isInlineOnly: false,
  isListed: true,
  label: "Heading",
  children: ["Heading you can edit"],
};

export default meta;
