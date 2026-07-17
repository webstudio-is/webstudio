import {
  executeRuntimeMutation,
  getWebstudioData,
} from "../instance-utils/data";
import { toast } from "@webstudio-is/design-system";
import {
  type WebstudioFragment,
  findPageByIdOrPath,
  findParentFolderByChildId,
  type Folder,
  type Page,
  type PageTemplate,
} from "@webstudio-is/sdk";
import { $pages, $project } from "~/shared/sync/data-stores";
import { detectFragmentTokenConflicts } from "@webstudio-is/project-build/runtime";
import { resolveTokenConflicts } from "../resolve-token-conflicts";
import {
  createFolderCopyData,
  createPageCopyData,
  createTemplateCopyData,
} from "@webstudio-is/project-build/runtime";
import {
  pageTransferDataVersion,
  parsePageTransferData,
  type FolderTransferData,
  type PageTransferData,
  type PageTransferItem,
  type TemplateTransferData,
} from "@webstudio-is/project-build/transfer";
import { $selectedPage } from "../nano-states";
import { getPageActionTarget } from "../page-action-target";
import { pasteHandled, pasteIgnored, type Plugin } from "./copy-paste";
import { breakpointPasteLimitWarning } from "@webstudio-is/project-build/runtime";

const invalidPasteDataMessage =
  "Could not paste Webstudio page data. The clipboard data appears to be incomplete or invalid.";

const stringify = (data: PageTransferItem) => {
  return JSON.stringify({ [pageTransferDataVersion]: data });
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

const addPageType = (
  data: ReturnType<typeof createPageCopyData>
): PageTransferData => ({
  ...data,
  type: "page",
});

const addTemplateType = (
  data: ReturnType<typeof createTemplateCopyData>
): TemplateTransferData => ({
  ...data,
  type: "template",
});

const addFolderType = (
  data: NonNullable<ReturnType<typeof createFolderCopyData>>
): FolderTransferData => ({
  type: "folder",
  folder: data.folder,
  children: data.children.map((child) =>
    "folder" in child ? addFolderType(child) : addPageType(child)
  ),
});

const getPageCopyData = (
  data: ReturnType<typeof getWebstudioData>,
  pageId: Page["id"]
): PageTransferData | undefined => {
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
  item: PageTransferItem
): Array<PageTransferData | TemplateTransferData> => {
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
  const transferData = parsePageTransferData(clipboardData);
  if (transferData.owned === false) {
    return pasteIgnored;
  }
  if (transferData.valid === false) {
    return { success: false, error: invalidPasteDataMessage } as const;
  }
  const item = transferData.data;

  const pages = $pages.get();
  const folderId = targetFolderId ?? getDefaultTargetFolderId();
  if (
    pages === undefined ||
    folderId === undefined ||
    pages.folders.has(folderId) === false
  ) {
    return pasteHandled;
  }

  try {
    const targetData = getWebstudioData();
    const projectId = $project.get()?.id;
    if (projectId === undefined) {
      return pasteHandled;
    }
    const conflicts = collectPageLikeItems(item).flatMap((item) =>
      detectFragmentTokenConflicts({
        fragment: mergeWebstudioFragments(item.rootFragment, item.bodyFragment),
        targetData,
      })
    );
    const conflictResolution = await resolveTokenConflicts(conflicts);
    if (conflictResolution === "cancel") {
      return pasteHandled;
    }

    const result = executeRuntimeMutation({
      id: "pageTransfer.insert",
      input: {
        item,
        targetFolderId: folderId,
        projectId,
        conflictResolution,
      },
    });
    if (result?.result.didReachBreakpointLimit) {
      toast.warn(breakpointPasteLimitWarning);
    }
    const newId = result?.result.id;
    if (newId) {
      toast.success(
        item.type === "page"
          ? "Page pasted"
          : item.type === "template"
            ? "Template pasted"
            : "Folder pasted"
      );
      return pasteHandled;
    }
  } catch {
    return pasteHandled;
  }

  return pasteHandled;
};

export const pageText: Plugin = {
  name: "page-text",
  mimeType: "text/plain",
  onCopy: handleCopyPage,
  onPaste: (clipboardData) => handlePastePage(clipboardData),
};
