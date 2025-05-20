import { MarkdownEmbedIcon } from "@webstudio-is/icons/svg";
import { descendantComponent, type WsComponentMeta } from "@webstudio-is/sdk";
import { props } from "./__generated__/markdown-embed.props";

export const meta: WsComponentMeta = {
  icon: MarkdownEmbedIcon,
  contentModel: {
    category: "instance",
    children: [descendantComponent],
  },
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
  initialProps: ["class"],
  props: {
    ...props,
    code: {
      required: true,
      control: "code",
      language: "markdown",
      type: "string",
    },
  },
};
