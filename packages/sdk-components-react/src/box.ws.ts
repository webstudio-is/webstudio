import type { WsComponentMeta } from "@webstudio-is/sdk";
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
  initialProps: ["tag", "id", "class"],
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
};
