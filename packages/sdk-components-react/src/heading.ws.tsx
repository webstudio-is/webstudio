import { HeadingIcon } from "@webstudio-is/icons/svg";
import type { ComponentProps } from "react";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { h1, h2, h3, h4, h5, h6 } from "@webstudio-is/react-sdk/css-normalize";
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
  category: "text",
  type: "container",
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
  order: 1,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["tag"],
};
