import { EmbedIcon } from "@webstudio-is/icons/svg";
import type {
  WsComponentMeta,
  WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { props } from "./__generated__/html-embed.props";

export const meta: WsComponentMeta = {
  category: "general",
  type: "embed",
  label: "HTML Embed",
  description: "Used to add HTML code to the page, such as an SVG or script.",
  icon: EmbedIcon,
  stylable: false,
  order: 8,
  invalidAncestors: ["Button", "Heading", "Link"],
};

export const propsMeta: WsComponentPropsMeta = {
  props: {
    ...props,
    executeScriptOnCanvas: {
      ...props.executeScriptOnCanvas,
      label: "Run script on canvas",
    },
    code: {
      required: true,
      control: "code",
      type: "string",
      rows: 10,
    },
  },
  initialProps: ["clientOnly", "executeScriptOnCanvas"],
};
