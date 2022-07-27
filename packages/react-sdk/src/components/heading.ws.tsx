import { HeadingIcon } from "@webstudio-is/icons";
import type { WsComponentMeta } from "./component-type";
import { Heading } from "./heading";

export default {
  Icon: HeadingIcon,
  Component: Heading,
  canAcceptChild: () => false,
  isContentEditable: true,
  isInlineOnly: false,
  label: "Heading",
} as WsComponentMeta<typeof Heading>;
