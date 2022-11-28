import { HeadingIcon } from "@webstudio-is/icons";
import type { WsComponentMeta } from "./component-type";
import { Heading } from "./heading";

const meta: WsComponentMeta<typeof Heading> = {
  type: "rich-text",
  label: "Heading",
  Icon: HeadingIcon,
  Component: Heading,
  children: ["Heading you can edit"],
};

export default meta;
