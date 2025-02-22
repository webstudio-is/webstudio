import { HeadingIcon } from "@webstudio-is/icons/svg";
import type { ComponentProps } from "react";
import {
  defaultStates,
  type PresetStyle,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/sdk";
import { h1, h2, h3, h4, h5, h6 } from "@webstudio-is/sdk/normalize.css";
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
  type: "container",
  placeholder: "Heading",
  icon: HeadingIcon,
  constraints: {
    relation: "ancestor",
    component: { $neq: "Heading" },
  },
  states: defaultStates,
  presetStyle,
};

export const propsMeta: WsComponentPropsMeta = {
  props,
  initialProps: ["id", "className", "tag"],
};
