import { TextIcon } from "@webstudio-is/icons/svg";
import type { WsComponentMeta } from "@webstudio-is/sdk";
import { div } from "@webstudio-is/sdk/normalize.css";
import { props } from "./__generated__/text.props";

export const meta: WsComponentMeta = {
  icon: TextIcon,
  presetStyle: {
    div: [
      ...div,
      {
        property: "min-height",
        value: { type: "unit", unit: "em", value: 1 },
      },
    ],
  },
  initialProps: ["tag", "id", "class"],
  props: {
    ...props,
    tag: {
      required: true,
      control: "tag",
      type: "string",
      options: ["div", "cite", "figcaption", "span"],
    },
  },
};
