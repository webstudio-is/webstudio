import { BoxIcon } from "@webstudio-is/icons";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import { props } from "./__generated__/box.props";
import type { Box } from "./box";
import type { ComponentProps } from "react";
import type { Style } from "@webstudio-is/css-data";
import {
  div,
  address,
  article,
  aside,
  figure,
  footer,
  header,
  main,
  nav,
  section,
} from "../css/normalize";

type BoxTags = NonNullable<ComponentProps<typeof Box>["tag"]>;

const presetStyle = {
  div,
  address,
  article,
  aside,
  figure,
  footer,
  header,
  main,
  nav,
  section,
} as const satisfies Record<BoxTags, Style>;

export const meta: WsComponentMeta = {
  category: "general",
  type: "container",
  label: "Box",
  Icon: BoxIcon,
  presetStyle,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["tag"],
};
