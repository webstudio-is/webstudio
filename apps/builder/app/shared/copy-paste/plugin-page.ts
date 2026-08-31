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
import {
  $assetFolders,
  $assets,
  $pages,
  $project,
} from "~/shared/sync/data-stores";
import { detectFragmentTokenConflicts } from "@webstudio-is/project-build/runtime";
import { resolveTokenConflicts } from "../resolve-token-conflicts";
import { resolveRootStyleConflicts } from "../resolve-root-style-conflicts";
import {
  createFolderCopyData,
  createPageCopyData,
  createTemplateCopyData,
} from "@webstudio-is/project-build/runtime";
import {
  pageTransferDataVersion,
  parsePageTransferData,
  collectPageTransferItems,
  type FolderTransferData,
  type PageTransferData,
  type PageTransferItem,
  type TemplateTransferData,
} from "@webstudio-is/project-build/transfer";
import { $selectedPage } from "../nano-states";
import { getPageActionTarget } from "../page-action-target";
import { pasteHandled, pasteIgnored, type Plugin } from "./copy-paste";
import { breakpointPasteLimitWarning } from "@webstudio-is/project-build/runtime";
import { transferFragmentAssets } from "./asset-transfer-utils";
import { builderApi } from "../builder-api";
import { rewriteTransferredDocumentAssetReferences } from "./mdx-asset-transfer";
import {
  createClipboardAssetPaths,
  hasDynamicContentBlockSource,
  includeMdxAssetDependencies,
  prepareConnectedContentBlockFragment,
} from "./content-block-fragment";

const invalidPasteDataMessage =
  "Could not paste Webstudio page data. The clipboard data appears to be incomplete or invalid.";

const stringify = (
  data: PageTransferItem,
  assetFolders: ReturnType<typeof $assetFolders.get>
) => {
  const assets = new Map(
    collectPageTransferItems(data).flatMap((item) =>
      [item.rootFragment, item.bodyFragment].flatMap((fragment) =>
        fragment.assets.map((asset) => [asset.id, asset] as const)
      )
    )
  );
  return JSON.stringify({
    [pageTransferDataVersion]: {
      ...data,
      sourceOrigin: window.location.origin,
      assetPaths: createClipboardAssetPaths(
        Array.from(assets.values()),
        assetFolders
      ),
    },
  });
};

const preparePageTransferItemRecursive = async ({
  item,
  projectId,
  assets,
  assetFolders,
  includeDependencies,
  discoveryCache,
  warnings,
}: {
  item: PageTransferItem;
  projectId: string | undefined;
  assets: ReturnType<typeof $assets.get>;
  assetFolders: ReturnType<typeof $assetFolders.get>;
  includeDependencies: typeof includeMdxAssetDependencies;
  discoveryCache: Map<string, Promise<readonly string[] | undefined>>;
  warnings: { skippedDependencies: boolean };
}): Promise<PageTransferItem> => {
  if (item.type === "folder") {
    return {
      ...item,
      children: (await Promise.all(
        item.children.map((child) =>
          preparePageTransferItemRecursive({
            item: child,
            projectId,
            assets,
            assetFolders,
            includeDependencies,
            discoveryCache,
            warnings,
          })
        )
      )) as FolderTransferData["children"],
    };
  }
  const prepared = {
    ...item,
    rootFragment: prepareConnectedContentBlockFragment({
      fragment: item.rootFragment,
      projectId,
      assets,
    }),
    bodyFragment: prepareConnectedContentBlockFragment({
      fragment: item.bodyFragment,
      projectId,
      assets,
    }),
  };
  if (projectId === undefined) {
    return prepared;
  }
  const [root, body] = await Promise.all(
    [prepared.rootFragment, prepared.bodyFragment].map((fragment) =>
      includeDependencies({
        fragment,
        projectId,
        assets,
        assetFolders,
        discoveryCache,
      })
    )
  );
  if (root.skippedAssetIds.length > 0 || body.skippedAssetIds.length > 0) {
    warnings.skippedDependencies = true;
  }
  return {
    ...prepared,
    rootFragment: root.fragment,
    bodyFragment: body.fragment,
  };
};

const preparePageTransferItem = async ({
  item,
  projectId,
  assets,
  assetFolders,
  includeDependencies = includeMdxAssetDependencies,
}: {
  item: PageTransferItem;
  projectId: string | undefined;
  assets: ReturnType<typeof $assets.get>;
  assetFolders: ReturnType<typeof $assetFolders.get>;
  includeDependencies?: typeof includeMdxAssetDependencies;
}) => {
  if (
    collectPageTransferItems(item).some(({ rootFragment, bodyFragment }) =>
      [rootFragment, bodyFragment].some(hasDynamicContentBlockSource)
    )
  ) {
    toast.warn(
      "Dynamic MDX sources are copied from the Collection items currently rendered on the canvas."
    );
  }
  const warnings = { skippedDependencies: false };
  const prepared = await preparePageTransferItemRecursive({
    item,
    projectId,
    assets,
    assetFolders,
    includeDependencies,
    discoveryCache: new Map(),
    warnings,
  });
  if (warnings.skippedDependencies) {
    toast.warn(
      "Some MDX dependencies could not be inspected and were skipped while copying."
    );
  }
  return prepared;
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

const includeMetaAssets = (
  fragment: WebstudioFragment,
  assetIds: Array<string | undefined>,
  assets: ReturnType<typeof getWebstudioData>["assets"]
) => {
  const fragmentAssets = new Map(
    fragment.assets.map((asset) => [asset.id, asset])
  );
  for (const assetId of assetIds) {
    const asset = assetId === undefined ? undefined : assets.get(assetId);
    if (asset !== undefined) {
      fragmentAssets.set(asset.id, asset);
    }
  }
  return { ...fragment, assets: Array.from(fragmentAssets.values()) };
};

const addPageType = (
  data: ReturnType<typeof createPageCopyData>,
  assets: ReturnType<typeof getWebstudioData>["assets"]
): PageTransferData => ({
  ...data,
  bodyFragment: includeMetaAssets(
    data.bodyFragment,
    [
      data.page.meta.socialImageAssetId,
      data.page.marketplace?.thumbnailAssetId,
    ],
    assets
  ),
  type: "page",
});

const addTemplateType = (
  data: ReturnType<typeof createTemplateCopyData>,
  assets: ReturnType<typeof getWebstudioData>["assets"]
): TemplateTransferData => ({
  ...data,
  bodyFragment: includeMetaAssets(
    data.bodyFragment,
    [data.template.meta.socialImageAssetId],
    assets
  ),
  type: "template",
});

const addFolderType = (
  data: NonNullable<ReturnType<typeof createFolderCopyData>>,
  assets: ReturnType<typeof getWebstudioData>["assets"]
): FolderTransferData => ({
  type: "folder",
  folder: data.folder,
  children: data.children.map((child) =>
    "folder" in child
      ? addFolderType(child, assets)
      : addPageType(child, assets)
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
  return addPageType(createPageCopyData({ data, page }), data.assets);
};

const remapPageTransferAssets = (
  item: PageTransferItem,
  fragments: Map<WebstudioFragment, WebstudioFragment>,
  assetIds: Map<string, string>
): PageTransferItem => {
  const remapAssetId = (assetId: string | undefined) => {
    return assetId === undefined
      ? undefined
      : (assetIds.get(assetId) ?? assetId);
  };
  if (item.type === "folder") {
    return {
      ...item,
      children: item.children.map((child) =>
        remapPageTransferAssets(child, fragments, assetIds)
      ) as FolderTransferData["children"],
    };
  }
  if (item.type === "page") {
    const socialImageAssetId = item.page.meta.socialImageAssetId;
    const thumbnailAssetId = item.page.marketplace?.thumbnailAssetId;
    return {
      ...item,
      rootFragment: fragments.get(item.rootFragment) ?? item.rootFragment,
      bodyFragment: fragments.get(item.bodyFragment) ?? item.bodyFragment,
      page: {
        ...item.page,
        marketplace:
          item.page.marketplace === undefined
            ? undefined
            : {
                ...item.page.marketplace,
                thumbnailAssetId: remapAssetId(thumbnailAssetId),
              },
        meta: {
          ...item.page.meta,
          socialImageAssetId: remapAssetId(socialImageAssetId),
        },
      },
    };
  }
  const socialImageAssetId = item.template.meta.socialImageAssetId;
  return {
    ...item,
    rootFragment: fragments.get(item.rootFragment) ?? item.rootFragment,
    bodyFragment: fragments.get(item.bodyFragment) ?? item.bodyFragment,
    template: {
      ...item.template,
      meta: {
        ...item.template.meta,
        socialImageAssetId: remapAssetId(socialImageAssetId),
      },
    },
  };
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

export const copyPageData = async (pageId: Page["id"]) => {
  const data = getWebstudioData();
  const pageData = getPageCopyData(data, pageId);
  if (pageData === undefined) {
    return;
  }
  return stringify(
    await preparePageTransferItem({
      item: pageData,
      projectId: $project.get()?.id,
      assets: data.assets,
      assetFolders: data.assetFolders,
    }),
    data.assetFolders
  );
};

export const copyTemplateData = async (templateId: PageTemplate["id"]) => {
  const data = getWebstudioData();
  const template = data.pages.pageTemplates?.get(templateId);
  if (template === undefined) {
    return;
  }
  return stringify(
    await preparePageTransferItem({
      item: addTemplateType(
        createTemplateCopyData({ data, template }),
        data.assets
      ),
      projectId: $project.get()?.id,
      assets: data.assets,
      assetFolders: data.assetFolders,
    }),
    data.assetFolders
  );
};

export const copyFolderData = async (folderId: Folder["id"]) => {
  const data = getWebstudioData();
  const folderData = createFolderCopyData({ data, folderId });
  if (folderData === undefined) {
    return;
  }
  return stringify(
    await preparePageTransferItem({
      item: addFolderType(folderData, data.assets),
      projectId: $project.get()?.id,
      assets: data.assets,
      assetFolders: data.assetFolders,
    }),
    data.assetFolders
  );
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
  const { sourceOrigin, assetPaths, ...transferItem } = transferData.data;
  let item: PageTransferItem = transferItem;

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
    const sourcePageItems = collectPageTransferItems(item);
    if (sourceOrigin !== undefined) {
      const assetIds = new Set(
        sourcePageItems.flatMap((item) => [
          ...item.rootFragment.assets.map((asset) => asset.id),
          ...item.bodyFragment.assets.map((asset) => asset.id),
        ])
      );
      const hasMissingMetaAsset = sourcePageItems.some((item) => {
        const metaAssetIds =
          item.type === "page"
            ? [
                item.page.meta.socialImageAssetId,
                item.page.marketplace?.thumbnailAssetId,
              ]
            : [item.template.meta.socialImageAssetId];
        return metaAssetIds.some(
          (assetId) => assetId !== undefined && assetIds.has(assetId) === false
        );
      });
      if (hasMissingMetaAsset) {
        return { success: false, error: invalidPasteDataMessage } as const;
      }
    }
    const conflicts = sourcePageItems.flatMap((item) =>
      detectFragmentTokenConflicts({
        fragment: mergeWebstudioFragments(item.rootFragment, item.bodyFragment),
        targetData,
      })
    );
    const conflictResolution = await resolveTokenConflicts(conflicts);
    if (conflictResolution === "cancel") {
      return pasteHandled;
    }
    const rootStyleTargetData = getWebstudioData();
    const firstPageLikeItem = sourcePageItems[0];
    const rootStyleConflictResolution =
      firstPageLikeItem === undefined
        ? undefined
        : await resolveRootStyleConflicts({
            fragment: firstPageLikeItem.rootFragment,
            targetData: rootStyleTargetData,
          });
    if (rootStyleConflictResolution === "cancel") {
      return pasteHandled;
    }
    const transferred = await transferFragmentAssets({
      sourceOrigin: sourceOrigin ?? window.location.origin,
      projectId,
      fragments: sourcePageItems.flatMap((item) => [
        item.rootFragment,
        item.bodyFragment,
      ]),
      importAssets: builderApi.importAssets,
    });
    if (transferred.success === false) {
      return transferred;
    }
    if ($project.get()?.id !== projectId) {
      return {
        success: false,
        error: "Project changed while pasting.",
      } as const;
    }
    if (sourceOrigin !== undefined) {
      const sourceAssets = new Map(
        sourcePageItems.flatMap((item) =>
          [item.rootFragment, item.bodyFragment].flatMap((fragment) =>
            fragment.assets.map((asset) => [asset.id, asset] as const)
          )
        )
      );
      try {
        const { skippedInvalidAssetIds } =
          await rewriteTransferredDocumentAssetReferences({
            sourceOrigin,
            projectId,
            sourceAssets: Array.from(sourceAssets.values()),
            sourceAssetPaths: assetPaths,
            importedAssets: transferred.assets,
          });
        if (skippedInvalidAssetIds.length > 0) {
          toast.warn(
            "Some invalid content files were copied unchanged. Open them to review their diagnostics."
          );
        }
      } catch {
        return {
          success: false,
          error:
            "Could not update Asset references in the copied content files.",
        } as const;
      }
    }
    if ($project.get()?.id !== projectId) {
      return {
        success: false,
        error: "Project changed while pasting.",
      } as const;
    }
    item = remapPageTransferAssets(
      item,
      transferred.fragments,
      transferred.assetIds
    );
    const result = executeRuntimeMutation({
      id: "pageTransfer.insert",
      input: {
        item,
        targetFolderId: folderId,
        projectId,
        conflictResolution,
        rootStyleConflictResolution,
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

    return pasteHandled;
  } catch {
    return pasteHandled;
  }
};

export const pageText: Plugin = {
  name: "page-text",
  mimeType: "text/plain",
  onCopy: handleCopyPage,
  onPaste: (clipboardData) => handlePastePage(clipboardData),
};

export const __testing__ = { preparePageTransferItem };
