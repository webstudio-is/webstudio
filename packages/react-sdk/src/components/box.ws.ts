import { BoxIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "./component-meta";
import { props } from "./__generated__/box.props";
import type { Box } from "./box";
import type { ComponentProps } from "react";
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
} satisfies PresetStyle<BoxTags>;

export const meta: WsComponentMeta = {
  category: "general",
  type: "container",
  label: "Box",
  icon: BoxIcon,
  states: defaultStates,
  presetStyle,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["tag"],
};
