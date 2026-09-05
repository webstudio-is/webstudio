/** @jsxImportSource @webstudio-is/template */
import { type TemplateMeta, setInstanceMeta } from "@webstudio-is/template";
import { HeadLink, HeadMeta, HeadSlot, HeadTitle } from "./components";

export const meta: TemplateMeta = {
  category: "general",
  description:
    "The Head Slot component lets you customize page-specific head elements (like canonical URLs), which merge with your site's global head settings, with Head Slot definitions taking priority over Page Settings. For site-wide head changes, use project settings instead.",
  order: 5,
  template: (
    <HeadSlot>
      {setInstanceMeta({ label: "Title" }, <HeadTitle>Title</HeadTitle>)}
      {setInstanceMeta({ label: "Link" }, <HeadLink rel="help" href="/help" />)}
      {setInstanceMeta(
        { label: "Meta" },
        <HeadMeta name="keywords" content="SEO" />
      )}
    </HeadSlot>
  ),
};
