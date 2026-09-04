import { $, type TemplateMeta } from "@webstudio-is/template";
const CodeTextComponent = $.CodeText;

export const CodeText: TemplateMeta = {
  category: "typography",
  template: <CodeTextComponent>{'const status = "ready";'}</CodeTextComponent>,
};
