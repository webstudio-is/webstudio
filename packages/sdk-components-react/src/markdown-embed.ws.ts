import { MarkdownEmbedIcon } from "@webstudio-is/icons/svg";
import type { WsComponentMeta, WsComponentPropsMeta } from "@webstudio-is/sdk";
import { props } from "./__generated__/markdown-embed.props";

export const meta: WsComponentMeta = {
  type: "embed",
  icon: MarkdownEmbedIcon,
  presetStyle: {
    div: [
      {
        property: "display",
        value: { type: "keyword", value: "contents" },
      },
      {
        property: "white-space-collapse",
        value: { type: "keyword", value: "collapse" },
      },
    ],
  },
};

export const propsMeta: WsComponentPropsMeta = {
  props: {
    ...props,
    code: {
      required: true,
      control: "code",
      language: "markdown",
      type: "string",
    },
  },
  initialProps: ["className"],
};
