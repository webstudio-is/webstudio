import { EmbedIcon } from "@webstudio-is/icons/svg";
import { descendantComponent, type WsComponentMeta } from "@webstudio-is/sdk";
import { props } from "./__generated__/html-embed.props";

export const meta: WsComponentMeta = {
  category: "general",
  label: "HTML Embed",
  description: "Used to add HTML code to the page, such as an SVG or script.",
  icon: EmbedIcon,
  order: 3,
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
  initialProps: ["class", "clientOnly", "executeScriptOnCanvas"],
  props: {
    ...props,
    clientOnly: {
      ...props.clientOnly,
      description:
        "Activate it for any scripts that can mutate the DOM or introduce interactivity. This only affects the published site.",
    },
    executeScriptOnCanvas: {
      ...props.executeScriptOnCanvas,
      label: "Run scripts on canvas",
      description:
        "Dangerously allow script execution on canvas without switching to preview mode. This only affects build mode, but may result in unwanted side effects inside builder!",
    },
    code: {
      required: true,
      control: "code",
      language: "html",
      type: "string",
    },
  },
};
