import { type TemplateMeta, $, PlaceholderValue } from "@webstudio-is/template";

export const meta: TemplateMeta = {
  category: "forms",
  order: 2,
  description:
    "Use a button to submit forms or trigger actions within a page. Do not use a button to navigate users to another resource or another page - that’s what a link is used for.",
  template: (
    <$.Button>{new PlaceholderValue("Button text you can edit")}</$.Button>
  ),
};
