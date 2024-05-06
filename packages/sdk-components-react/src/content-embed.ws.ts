import { EmbedIcon } from "@webstudio-is/icons/svg";
import {
  WsEmbedTemplate,
  descendentComponent,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { div } from "@webstudio-is/react-sdk/css-normalize";
import { props } from "./__generated__/content-embed.props";

const descendent = (label: string, tag: string): WsEmbedTemplate[number] => {
  return {
    type: "instance",
    component: descendentComponent,
    label,
    props: [{ type: "string", name: "selector", value: ` ${tag}` }],
    children: [],
  };
};

export const meta: WsComponentMeta = {
  category: "general",
  type: "control",
  label: "Content Embed",
  icon: EmbedIcon,
  presetStyle: {
    div,
  },
  order: 8,
  template: [
    {
      type: "instance",
      component: "ContentEmbed",
      children: [
        descendent("Paragraph", "p"),
        descendent("Heading 1", "h1"),
        descendent("Heading 2", "h2"),
        descendent("Heading 3", "h3"),
        descendent("Heading 4", "h4"),
        descendent("Heading 5", "h5"),
        descendent("Heading 6", "h6"),
        descendent("Bold", ":where(strong, b)"),
        descendent("Italic", ":where(em, i)"),
        descendent("Link", "a"),
        descendent("Image", "img"),
        descendent("Blockquote", "blockquote"),
        descendent("Code Text", "code"),
        descendent("List", ":where(ul, ol)"),
        descendent("List Item", "li"),
        descendent("Separator", "hr"),
      ],
    },
  ],
};

export const propsMeta: WsComponentPropsMeta = {
  props: {
    ...props,
    html: {
      required: true,
      control: "code",
      type: "string",
    },
  },
  initialProps: ["id", "className"],
};
