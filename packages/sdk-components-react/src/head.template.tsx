import { type TemplateMeta, $ } from "@webstudio-is/template";

export const meta: TemplateMeta = {
  category: "general",
  description: "Head",
  order: 4,
  template: (
    <$.Head>
      <$.HeadLink rel="help" href="/help"></$.HeadLink>
    </$.Head>
  ),
};
