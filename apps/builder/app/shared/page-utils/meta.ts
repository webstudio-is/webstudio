import { z } from "zod";
import type { buildPatchTransaction } from "@webstudio-is/protocol";
import type { Page, Pages } from "@webstudio-is/sdk";
import { getFolderChildReparentPlan, registerFolderChildMutable } from "./tree";
import { compactBuildPatchPayload } from "../build-patch-utils";

type PageMeta = Page["meta"];

const emptyStringRemovesMetaFields = new Set<keyof PageMeta>([
  "language",
  "redirect",
  "socialImageAssetId",
  "socialImageUrl",
]);

const normalizePageMetaValue = <Name extends keyof PageMeta>(
  name: Name,
  value: PageMeta[Name]
) => {
  if (value === "" && emptyStringRemovesMetaFields.has(name)) {
    return undefined;
  }
  return value;
};

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

type PageMetaPatchInput = Partial<{
  description: Page["meta"]["description"];
  language: Page["meta"]["language"];
  redirect: Page["meta"]["redirect"];
  socialImageUrl: Page["meta"]["socialImageUrl"];
  socialImageAssetId: Page["meta"]["socialImageAssetId"];
  excludePageFromSearch: boolean;
  documentType: Page["meta"]["documentType"];
  content: Page["meta"]["content"];
  custom: Page["meta"]["custom"];
}>;

type PageFieldsPatchInput = Partial<{
  name: Page["name"];
  path: Page["path"];
  title: Page["title"];
  parentFolderId: string;
  meta: PageMetaPatchInput;
}>;

export const pageMetaInput = z.object({
  description: z.string().optional(),
  language: z.string().optional(),
  redirect: z.string().optional(),
  socialImageUrl: z.string().optional(),
  socialImageAssetId: z.string().optional(),
  excludePageFromSearch: z.boolean().optional(),
  documentType: z.enum(["html", "xml", "text"]).optional(),
  content: z.string().optional(),
  custom: z
    .array(z.object({ property: z.string(), content: z.string() }))
    .optional(),
});

export const pageFieldsInput = z.object({
  name: z.string().min(1).optional(),
  path: z.string().optional(),
  title: z.string().optional(),
  parentFolderId: z.string().optional(),
  meta: pageMetaInput.optional(),
});

export const pageMetaToPatchValue = (meta: PageMetaPatchInput) => {
  const result: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(meta)) {
    result[name] =
      name === "excludePageFromSearch"
        ? String(value)
        : normalizePageMetaValue(name as keyof PageMeta, value as never);
  }
  return result;
};

export const createPageUpdatePatches = ({
  input,
  page,
  pages,
}: {
  input: PageFieldsPatchInput;
  page: Page;
  pages: Pages;
}) => {
  const patches: Array<{
    op: "add" | "replace" | "remove";
    path: Array<string | number>;
    value?: unknown;
  }> = [];
  const replace = (path: Array<string | number>, value: unknown) => {
    patches.push({ op: "replace", path, value });
  };

  if (input.name !== undefined) {
    replace(["pages", page.id, "name"], input.name);
  }
  if (input.path !== undefined) {
    replace(
      ["pages", page.id, "path"],
      page.id === pages.homePageId ? "" : input.path
    );
  }
  if (input.title !== undefined) {
    replace(["pages", page.id, "title"], input.title);
  }
  if (input.meta !== undefined) {
    for (const [name, value] of Object.entries(
      pageMetaToPatchValue(input.meta)
    )) {
      if (value === undefined) {
        if (Object.hasOwn(page.meta, name)) {
          patches.push({
            op: "remove",
            path: ["pages", page.id, "meta", name],
          });
        }
        continue;
      }
      patches.push({
        op: Object.hasOwn(page.meta, name) ? "replace" : "add",
        path: ["pages", page.id, "meta", name],
        value,
      });
    }
  }
  if (input.parentFolderId !== undefined) {
    const plan = getFolderChildReparentPlan(
      pages.folders,
      page.id,
      input.parentFolderId
    );
    if (plan !== undefined) {
      patches.push({
        op: "remove",
        path: ["folders", plan.currentFolderId, "children", plan.currentIndex],
      });
      patches.push({
        op: "add",
        path: ["folders", plan.nextFolderId, "children", plan.nextIndex],
        value: page.id,
      });
    }
  }
  return patches;
};

export const createPageUpdatePayload = (
  input: Parameters<typeof createPageUpdatePatches>[0]
): z.infer<typeof buildPatchTransaction>["payload"] => {
  const patches = createPageUpdatePatches(input);
  return compactBuildPatchPayload([{ namespace: "pages", patches }]);
};

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
