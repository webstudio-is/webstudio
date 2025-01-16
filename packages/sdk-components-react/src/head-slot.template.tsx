import { type TemplateMeta, $ } from "@webstudio-is/template";

export const meta: TemplateMeta = {
  category: "general",
  description: "Head",
  order: 4,
  template: (
    <$.HeadSlot>
      <$.HeadLink ws:label="Link" rel="help" href="/help"></$.HeadLink>
      <$.HeadMeta ws:label="Meta" name="keywords" content="SEO"></$.HeadMeta>
    </$.HeadSlot>
  ),
};
