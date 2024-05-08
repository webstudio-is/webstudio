import { EmbedIcon } from "@webstudio-is/icons/svg";
import {
  WsEmbedTemplate,
  descendantComponent,
  type WsComponentMeta,
} from "@webstudio-is/react-sdk";

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
  category: "data",
  type: "control",
  label: "Content Embed",
  icon: EmbedIcon,
  order: 3,
  template: [
    {
      type: "instance",
      component: "HtmlEmbed",
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
