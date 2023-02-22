import { HeadingIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-type";
import { props } from "./__generated__/heading.props";

export const meta: WsComponentMeta = {
  type: "rich-text",
  label: "Heading",
  Icon: HeadingIcon,
  children: ["Heading you can edit"],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["tag"],
};
