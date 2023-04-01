import type { Style } from "@webstudio-is/css-data";
import { HeadingIcon } from "@webstudio-is/icons";
import type { ComponentProps } from "react";
import { h1, h2, h3, h4, h5, h6 } from "../css/normalize";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import type { Heading } from "./heading";
import { props } from "./__generated__/heading.props";

type HeadingTags = NonNullable<ComponentProps<typeof Heading>["tag"]>;

const presetStyle = {
  h1,
  h2,
  h3,
  h4,
  h5,
  h6,
} as const satisfies Record<HeadingTags, Style>;

export const meta: WsComponentMeta = {
  category: "typography",
  type: "rich-text",
  label: "Heading",
  Icon: HeadingIcon,
  children: ["Heading you can edit"],
  presetStyle,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["tag"],
};
