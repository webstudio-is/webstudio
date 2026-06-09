import { z } from "zod";
import { toast } from "@webstudio-is/design-system";
import {
  WebstudioFragment,
  findPageByIdOrPath,
  findParentFolderByChildId,
  type Folder,
  type Page,
  type PageTemplate,
} from "@webstudio-is/sdk";
import { $pages } from "~/shared/sync/data-stores";
import {
  detectFragmentTokenConflicts,
  getWebstudioData,
  updateWebstudioData,
} from "../instance-utils";
import { builderApi } from "../builder-api";
import {
  createFolderCopyData,
  createPageCopyData,
  createTemplateCopyData,
  insertFolderCopyFromDataMutable,
  insertPageCopyFromFragmentsMutable,
  insertTemplateCopyFromFragmentsMutable,
  type FolderCopyData,
  type PageCopyData,
  type TemplateCopyData,
} from "../page-utils";
import { $selectedPage } from "../nano-states";
import { getPageActionTarget } from "../page-action-target";
import type { Plugin } from "./copy-paste";
import { breakpointPasteLimitWarning } from "../breakpoints";

const version = "@webstudio/page/v0.1";

type PageData = PageCopyData & { type: "page" };

type TemplateData = TemplateCopyData & { type: "template" };

type FolderData = Omit<FolderCopyData, "children"> & {
  type: "folder";
  children: Array<PageData | FolderData>;
};

const PageData: z.ZodType<PageData> = z.object({
  type: z.literal("page"),
  page: z.custom<Page>(),
  rootFragment: WebstudioFragment,
  bodyFragment: WebstudioFragment,
});

const TemplateData: z.ZodType<TemplateData> = z.object({
  type: z.literal("template"),
  template: z.custom<PageTemplate>(),
  rootFragment: WebstudioFragment,
  bodyFragment: WebstudioFragment,
});

const FolderData: z.ZodType<FolderData> = z.lazy(() =>
  z.object({
    type: z.literal("folder"),
    folder: z.custom<Folder>(),
    children: z.array(z.union([PageData, FolderData])),
  })
);

const ClipboardItem = z.union([PageData, TemplateData, FolderData]);

type ClipboardItem = z.infer<typeof ClipboardItem>;

const ClipboardData = z.object({ [version]: ClipboardItem });

const stringify = (data: ClipboardItem) => {
  return JSON.stringify({ [version]: data });
};

const parse = (clipboardData: string): ClipboardItem | undefined => {
  try {
    const data = ClipboardData.parse(JSON.parse(clipboardData));
    return data[version];
  } catch {
    return;
  }
};

const getDefaultTargetFolderId = () => {
  const pages = $pages.get();
  if (pages === undefined) {
    return;
  }
  const selectedPage = $selectedPage.get();
  if (selectedPage) {
    return (
      findParentFolderByChildId(selectedPage.id, pages.folders)?.id ??
      pages.rootFolderId
    );
  }
  return pages.rootFolderId;
};

const mergeWebstudioFragments = (
  ...fragments: WebstudioFragment[]
): WebstudioFragment => {
  return {
    children: fragments.flatMap((fragment) => fragment.children),
    instances: fragments.flatMap((fragment) => fragment.instances),
    assets: fragments.flatMap((fragment) => fragment.assets),
    dataSources: fragments.flatMap((fragment) => fragment.dataSources),
    resources: fragments.flatMap((fragment) => fragment.resources),
    props: fragments.flatMap((fragment) => fragment.props),
    breakpoints: fragments.flatMap((fragment) => fragment.breakpoints),
    styleSourceSelections: fragments.flatMap(
      (fragment) => fragment.styleSourceSelections
    ),
    styleSources: fragments.flatMap((fragment) => fragment.styleSources),
    styles: fragments.flatMap((fragment) => fragment.styles),
  } satisfies WebstudioFragment;
};

const addPageType = (data: PageCopyData): PageData => ({
  ...data,
  type: "page",
});

const addTemplateType = (data: TemplateCopyData): TemplateData => ({
  ...data,
  type: "template",
});

const addFolderType = (data: FolderCopyData): FolderData => ({
  type: "folder",
  folder: data.folder,
  children: data.children.map((child) =>
    "folder" in child ? addFolderType(child) : addPageType(child)
  ),
});

const getPageCopyData = (
  data: ReturnType<typeof getWebstudioData>,
  pageId: Page["id"]
): PageData | undefined => {
  const page = findPageByIdOrPath(pageId, data.pages);
  if (page === undefined) {
    return;
  }
  return addPageType(createPageCopyData({ data, page }));
};

const handleCopyPage = () => {
  const target = getPageActionTarget();
  if (target?.type === "page") {
    return copyPageData(target.id);
  }
  if (target?.type === "folder") {
    return copyFolderData(target.id);
  }
  if (target?.type === "template") {
    return copyTemplateData(target.id);
  }
};

const collectPageLikeItems = (
  item: ClipboardItem
): Array<PageData | TemplateData> => {
  if (item.type === "page" || item.type === "template") {
    return [item];
  }
  return item.children.flatMap(collectPageLikeItems);
};

export const copyPageData = (pageId: Page["id"]) => {
  const data = getWebstudioData();
  const pageData = getPageCopyData(data, pageId);
  if (pageData === undefined) {
    return;
  }
  return stringify(pageData);
};

export const copyTemplateData = (templateId: PageTemplate["id"]) => {
  const data = getWebstudioData();
  const template = data.pages.pageTemplates?.get(templateId);
  if (template === undefined) {
    return;
  }
  return stringify(addTemplateType(createTemplateCopyData({ data, template })));
};

export const copyFolderData = (folderId: Folder["id"]) => {
  const data = getWebstudioData();
  const folderData = createFolderCopyData({ data, folderId });
  if (folderData === undefined) {
    return;
  }
  return stringify(addFolderType(folderData));
};

export const handlePastePage = async (
  clipboardData: string,
  targetFolderId?: Folder["id"]
) => {
  const item = parse(clipboardData);
  if (item === undefined) {
    return false;
  }

  const pages = $pages.get();
  const folderId = targetFolderId ?? getDefaultTargetFolderId();
  if (
    pages === undefined ||
    folderId === undefined ||
    pages.folders.has(folderId) === false
  ) {
    return true;
  }

  try {
    const conflicts = collectPageLikeItems(item).flatMap((item) =>
      detectFragmentTokenConflicts({
        fragment: mergeWebstudioFragments(item.rootFragment, item.bodyFragment),
      })
    );
    const conflictResolution =
      conflicts.length > 0
        ? await builderApi.showTokenConflictDialog(conflicts)
        : "theirs";

    let newId: Page["id"] | Folder["id"] | undefined;
    const onBreakpointLimitMerge = () => {
      toast.warn(breakpointPasteLimitWarning);
    };
    updateWebstudioData((data) => {
      if (item.type === "page") {
        newId = insertPageCopyFromFragmentsMutable({
          source: item,
          target: { data, folderId },
          conflictResolution,
          onBreakpointLimitMerge,
        });
        return;
      }
      if (item.type === "template") {
        newId = insertTemplateCopyFromFragmentsMutable({
          source: item,
          target: { data },
          conflictResolution,
          onBreakpointLimitMerge,
        });
        return;
      }
      newId = insertFolderCopyFromDataMutable({
        source: item,
        target: { data, parentFolderId: folderId },
        conflictResolution,
        onBreakpointLimitMerge,
      });
    });
    if (newId) {
      toast.success(
        item.type === "page"
          ? "Page pasted"
          : item.type === "template"
            ? "Template pasted"
            : "Folder pasted"
      );
      return true;
    }
  } catch {
    return true;
  }

  return true;
};

export const pageText: Plugin = {
  name: "page-text",
  mimeType: "text/plain",
  onCopy: handleCopyPage,
  onPaste: handlePastePage,
};
