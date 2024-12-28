import { type TemplateMeta, $, PlaceholderValue } from "@webstudio-is/template";

export const meta: TemplateMeta = {
  category: "typography",
  description:
    "A generic container for any text content that is not a heading or a link.",
  order: 0,
  template: <$.Text>{new PlaceholderValue("The text you can edit")}</$.Text>,
};
