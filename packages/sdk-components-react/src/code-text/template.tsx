import { $, type TemplateMeta } from "@webstudio-is/template";

export const CodeText: TemplateMeta = {
  category: "typography",
  template: (
    <$.CodeText
      code={'const status = "ready";'}
      language="javascript"
      theme="github-light"
    />
  ),
};
