import { HeadingIcon } from "@webstudio-is/icons";
import type { WsComponentMeta } from "./component-type";
import { Heading } from "./heading";

export default {
  Icon: HeadingIcon,
  Component: Heading,
  canAcceptChild: () => false,
  isContentEditable: true,
  isInlineOnly: false,
  isListed: true,
  label: "Heading",
  children: ["Heading you can edit"],
} as WsComponentMeta<typeof Heading>;
