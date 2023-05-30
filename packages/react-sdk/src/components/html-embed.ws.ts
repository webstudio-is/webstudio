import { EmbedIcon } from "@webstudio-is/icons/svg";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import { props } from "./__generated__/html-embed.props";

export const meta: WsComponentMeta = {
  category: "general",
  type: "embed",
  label: "HTML Embed",
  icon: EmbedIcon,
  stylable: false,
};

export const propsMeta: WsComponentPropsMeta = {
  props: {
    ...props,
    code: {
      required: true,
      control: "code",
      type: "string",
      rows: 10,
    },
  },
};
