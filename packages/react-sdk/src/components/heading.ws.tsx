import { HeadingIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import { props } from "./__generated__/heading.props";

export const meta: WsComponentMeta = {
  category: "typography",
  type: "rich-text",
  label: "Heading",
  Icon: HeadingIcon,
  children: ["Heading you can edit"],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["tag"],
};
