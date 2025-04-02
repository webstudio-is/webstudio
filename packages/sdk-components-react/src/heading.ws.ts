import { HeadingIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/sdk";
import { h1, h2, h3, h4, h5, h6 } from "@webstudio-is/sdk/normalize.css";
import { props } from "./__generated__/heading.props";

export const meta: WsComponentMeta = {
  type: "container",
  placeholder: "Heading",
  icon: HeadingIcon,
  states: defaultStates,
  presetStyle: {
    h1,
    h2,
    h3,
    h4,
    h5,
    h6,
  },
};

export const propsMeta: WsComponentPropsMeta = {
  props: {
    ...props,
    tag: {
      required: true,
      control: "tag",
      type: "string",
      options: ["h1", "h2", "h3", "h4", "h5", "h6"],
    },
  },
  initialProps: ["tag", "id", "className"],
};
