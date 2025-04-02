import { TextIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/sdk";
import { div } from "@webstudio-is/sdk/normalize.css";
import { props } from "./__generated__/text.props";

export const meta: WsComponentMeta = {
  type: "container",
  icon: TextIcon,
  states: defaultStates,
  presetStyle: {
    div: [
      ...div,
      {
        property: "min-height",
        value: { type: "unit", unit: "em", value: 1 },
      },
    ],
  },
};

export const propsMeta: WsComponentPropsMeta = {
  props: {
    ...props,
    tag: {
      required: true,
      control: "tag",
      type: "string",
      options: ["div", "cite", "figcaption", "span"],
    },
  },
  initialProps: ["tag", "id", "className"],
};
