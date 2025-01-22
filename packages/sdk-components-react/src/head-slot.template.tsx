import { type TemplateMeta, $ } from "@webstudio-is/template";

export const meta: TemplateMeta = {
  category: "general",
  description:
    "The Head Slot component lets you customize page-specific head elements (like canonical URLs), which merge with your site's global head settings, with Head Slot definitions taking priority over Page Settings. For site-wide head changes, use Project Settings instead.",
  order: 6,
  template: (
    <$.HeadSlot>
      <$.HeadTitle ws:label="Title">Title</$.HeadTitle>
      <$.HeadLink ws:label="Link" rel="help" href="/help"></$.HeadLink>
      <$.HeadMeta ws:label="Meta" name="keywords" content="SEO"></$.HeadMeta>
    </$.HeadSlot>
  ),
};
