import { EmbedIcon } from "@webstudio-is/icons/svg";
import {
  WsEmbedTemplate,
  descendantComponent,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import { div } from "@webstudio-is/react-sdk/css-normalize";
import { props } from "./__generated__/content-embed.props";

const descendant = (label: string, tag: string): WsEmbedTemplate[number] => {
  return {
    type: "instance",
    component: descendantComponent,
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
        descendant("Paragraph", "p"),
        descendant("Heading 1", "h1"),
        descendant("Heading 2", "h2"),
        descendant("Heading 3", "h3"),
        descendant("Heading 4", "h4"),
        descendant("Heading 5", "h5"),
        descendant("Heading 6", "h6"),
        descendant("Bold", ":where(strong, b)"),
        descendant("Italic", ":where(em, i)"),
        descendant("Link", "a"),
        descendant("Image", "img"),
        descendant("Blockquote", "blockquote"),
        descendant("Code Text", "code"),
        descendant("List", ":where(ul, ol)"),
        descendant("List Item", "li"),
        descendant("Separator", "hr"),
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
