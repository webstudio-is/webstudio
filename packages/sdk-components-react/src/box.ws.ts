import { BoxIcon } from "@webstudio-is/icons/svg";
import {
  defaultStates,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/sdk";
import {
  div,
  address,
  article,
  aside,
  figure,
  footer,
  header,
  main,
  nav,
  section,
} from "@webstudio-is/sdk/normalize.css";
import { props } from "./__generated__/box.props";

export const meta: WsComponentMeta = {
  category: "general",
  type: "container",
  description:
    "A container for content. By default this is a Div, but the tag can be changed in settings.",
  icon: BoxIcon,
  states: defaultStates,
  presetStyle: {
    div,
    address,
    article,
    aside,
    figure,
    footer,
    header,
    main,
    nav,
    section,
  },
  order: 0,
};

export const propsMeta: WsComponentPropsMeta = {
  props: {
    ...props,
    tag: {
      required: true,
      control: "tag",
      type: "string",
      options: [
        "div",
        "header",
        "footer",
        "nav",
        "main",
        "section",
        "article",
        "aside",
        "address",
        "figure",
        "span",
      ],
    },
  },
  initialProps: ["tag", "id", "className"],
};
