import { type TemplateMeta, $, PlaceholderValue } from "@webstudio-is/template";

export const meta: TemplateMeta = {
  category: "forms",
  order: 2,
  template: <$.Label>{new PlaceholderValue("Form Label")}</$.Label>,
};
