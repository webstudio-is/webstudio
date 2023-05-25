import { HeadingIcon } from "@webstudio-is/icons/svg";
import type { ComponentProps } from "react";
import { h1, h2, h3, h4, h5, h6 } from "../css/normalize";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "./component-meta";
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
} satisfies PresetStyle<HeadingTags>;

export const meta: WsComponentMeta = {
  category: "typography",
  type: "rich-text",
  label: "Heading",
  icon: HeadingIcon,
  states: defaultStates,
  presetStyle,
  template: [
    {
      type: "instance",
      component: "Heading",
      children: [{ type: "text", value: "Heading you can edit" }],
    },
  ],
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["tag"],
};
