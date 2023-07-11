import type { ComponentProps } from "react";
import { BoxIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
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
} from "@webstudio-is/react-sdk/css-normalize";
import { props } from "./__generated__/box.props";
import type { Box } from "./box";

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
  order: 0,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["id", "tag"],
};
