import type { WsComponentMeta } from "@webstudio-is/sdk";
import { h1, h2, h3, h4, h5, h6 } from "@webstudio-is/sdk/normalize.css";
import { props } from "./__generated__/heading.props";

export const meta: WsComponentMeta = {
  presetStyle: {
    h1,
    h2,
    h3,
    h4,
    h5,
    h6,
  },
  initialProps: ["tag", "id", "class"],
  props: {
    ...props,
    tag: {
      required: true,
      control: "tag",
      type: "string",
      options: ["h1", "h2", "h3", "h4", "h5", "h6"],
    },
  },
};
