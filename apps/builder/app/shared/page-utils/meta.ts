import type { Page, Pages } from "@webstudio-is/sdk";
import { normalizePageMetaValue } from "@webstudio-is/project-build/runtime/pages";
import { registerFolderChildMutable } from "./tree";

type PageMeta = Page["meta"];

const assignPageMetaValueMutable = <Name extends keyof PageMeta>(
  meta: PageMeta,
  name: Name,
  value: PageMeta[Name]
) => {
  const normalizedValue = normalizePageMetaValue(name, value);
  if (normalizedValue === undefined) {
    delete meta[name];
    return;
  }
  meta[name] = normalizedValue;
};

type PageFieldsUpdate = Partial<{
  name: Page["name"];
  path: Page["path"];
  title: Page["title"];
  description: Page["meta"]["description"];
  excludePageFromSearch: Page["meta"]["excludePageFromSearch"];
  language: Page["meta"]["language"];
  status: Page["meta"]["status"];
  redirect: Page["meta"]["redirect"];
  socialImageAssetId: Page["meta"]["socialImageAssetId"];
  socialImageUrl: Page["meta"]["socialImageUrl"];
  customMetas: NonNullable<Page["meta"]["custom"]>;
  documentType: Page["meta"]["documentType"];
  content: Page["meta"]["content"];
  parentFolderId: string;
}>;

export const updatePageFieldsMutable = ({
  page,
  pages,
  values,
}: {
  page: Page;
  pages: Pages;
  values: PageFieldsUpdate;
}) => {
  if (values.name !== undefined) {
    page.name = values.name;
  }
  if (values.path !== undefined) {
    page.path = page.id === pages.homePageId ? "" : values.path;
  }
  if (values.title !== undefined) {
    page.title = values.title;
  }
  if (values.description !== undefined) {
    page.meta.description = values.description;
  }
  if (values.excludePageFromSearch !== undefined) {
    page.meta.excludePageFromSearch = values.excludePageFromSearch;
  }
  if (values.language !== undefined) {
    assignPageMetaValueMutable(page.meta, "language", values.language);
  }
  if ("status" in values) {
    page.meta.status = values.status;
  }
  if (values.redirect !== undefined) {
    assignPageMetaValueMutable(page.meta, "redirect", values.redirect);
  }
  if (values.socialImageAssetId !== undefined) {
    assignPageMetaValueMutable(
      page.meta,
      "socialImageAssetId",
      values.socialImageAssetId
    );
  }
  if (values.socialImageUrl !== undefined) {
    assignPageMetaValueMutable(
      page.meta,
      "socialImageUrl",
      values.socialImageUrl
    );
  }
  if (values.customMetas !== undefined) {
    page.meta.custom = values.customMetas;
  }
  if (values.documentType !== undefined) {
    page.meta.documentType = values.documentType;
  }
  if (values.content !== undefined) {
    page.meta.content = values.content;
  }
  if (values.parentFolderId !== undefined) {
    registerFolderChildMutable(pages, page.id, values.parentFolderId);
  }
};
