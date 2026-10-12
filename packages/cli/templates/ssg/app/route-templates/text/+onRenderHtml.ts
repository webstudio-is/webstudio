import type { OnRenderHtmlAsync } from "vike/types";

export const onRenderHtml: OnRenderHtmlAsync = async (pageContext) => {
  pageContext.content = pageContext.data.pageMeta.content ?? "";
};
