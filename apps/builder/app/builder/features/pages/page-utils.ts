import {
  applyBuilderPatchPayloadMutable,
  updateWebstudioData,
} from "~/shared/instance-utils/data";
import { isFragmentContentModeCopyableProp } from "~/shared/content-mode-copy-policy";
import { computed } from "nanostores";
import slugify from "slugify";
import {
  type Page,
  type PageTemplate,
  type Folder,
  type WebstudioData,
  type Pages,
  findPageByIdOrPath,
  findParentFolderByChildId,
  getFolderById,
  encodeDataSourceVariable,
  ROOT_INSTANCE_ID,
  systemParameter,
  SYSTEM_VARIABLE_ID,
} from "@webstudio-is/sdk";
import { $variableValuesByInstanceSelector } from "~/shared/nano-states";
import { $dataSources, $pages, $project } from "~/shared/sync/data-stores";
import { getFolderDeletionTargets } from "@webstudio-is/project-build/runtime/pages";
import {
  collectExclusiveInstanceIds,
  createInstanceCleanupPayload,
} from "@webstudio-is/project-build/runtime/instances";
import {
  createFolderCopyData,
  createTemplateCopyData,
  insertFolderCopyFromDataMutable,
  insertPageCopyMutable,
  insertPageFromTemplateMutable,
  insertTemplateCopyFromFragmentsMutable,
} from "@webstudio-is/project-build/runtime/page-copy";
import { cleanupChildRefsMutable } from "~/shared/page-utils/tree";
import {
  $selectedPage,
  $registeredComponentMetas,
  getInstanceKey,
} from "~/shared/nano-states";
import { selectPage } from "~/shared/nano-states";

export const nameToPath = (pages: Pages | undefined, name: string) => {
  if (name === "") {
    return "";
  }
  const slug = slugify(name, { lower: true, strict: true });
  const path = `/${slug}`;
  if (pages === undefined) {
    return path;
  }
  if (findPageByIdOrPath(path, pages) === undefined) {
    return path;
  }
  let suffix = 1;
  while (findPageByIdOrPath(`${path}${suffix}`, pages) !== undefined) {
    suffix++;
  }
  return `${path}${suffix}`;
};

const deleteRootInstanceMutable = (
  data: WebstudioData,
  rootInstanceId: string
) => {
  applyBuilderPatchPayloadMutable(
    data,
    createInstanceCleanupPayload({
      instanceIds: collectExclusiveInstanceIds(data.instances, [
        rootInstanceId,
      ]),
      props: data.props?.values() ?? [],
      dataSources: data.dataSources?.values() ?? [],
      styleSources: data.styleSources?.values() ?? [],
      styleSourceSelections: data.styleSourceSelections?.values() ?? [],
      styles: data.styles?.values() ?? [],
    })
  );
};

/**
 * Deletes a page.
 */
export const deletePageMutable = (pageId: Page["id"], data: WebstudioData) => {
  const { pages } = data;
  if (pageId === pages.homePageId) {
    return;
  }
  // deselect page before deleting to avoid flash of content
  if ($selectedPage.get()?.id === pageId) {
    selectPage(pages.homePageId);
  }
  const rootInstanceId = findPageByIdOrPath(pageId, data.pages)?.rootInstanceId;
  if (rootInstanceId !== undefined) {
    deleteRootInstanceMutable(data, rootInstanceId);
  }
  pages.pages.delete(pageId);
  cleanupChildRefsMutable(pageId, data.pages.folders);
};

/**
 * Deletes folder and child folders.
 * Doesn't delete only returns pageIds.
 */
export const deleteFolderWithChildrenMutable = (
  folderId: Folder["id"],
  pages: Pages
) => {
  const { folders } = pages;
  const { folderIds, pageIds } = getFolderDeletionTargets(folderId, pages);
  for (const folderId of folderIds) {
    cleanupChildRefsMutable(folderId, folders);
    folders.delete(folderId);
  }

  return {
    folderIds,
    pageIds,
  };
};

export const $pageRootScope = computed(
  [$selectedPage, $variableValuesByInstanceSelector, $dataSources],
  (page, variableValuesByInstanceSelector, dataSources) => {
    const scope: Record<string, unknown> = {};
    const aliases = new Map<string, string>();
    const defaultValues = new Map<string, unknown>();
    if (page === undefined) {
      return { variableValues: defaultValues, scope, aliases };
    }
    const values =
      variableValuesByInstanceSelector.get(
        getInstanceKey([page.rootInstanceId, ROOT_INSTANCE_ID])
      ) ?? new Map<string, unknown>();
    for (const [dataSourceId, value] of values) {
      let dataSource = dataSources.get(dataSourceId);
      if (dataSourceId === SYSTEM_VARIABLE_ID) {
        dataSource = systemParameter;
      }
      if (dataSource === undefined) {
        continue;
      }
      const name = encodeDataSourceVariable(dataSourceId);
      scope[name] = value;
      aliases.set(name, dataSource.name);
    }
    return { variableValues: values, scope, aliases };
  }
);

export const duplicatePage = (pageId: Page["id"]) => {
  const projectId = $project.get()?.id;
  const pages = $pages.get();
  const currentFolder =
    pages === undefined
      ? undefined
      : findParentFolderByChildId(pageId, pages.folders);
  if (currentFolder === undefined || projectId === undefined) {
    return;
  }
  let newPageId: undefined | string;
  updateWebstudioData((data) => {
    newPageId = insertPageCopyMutable({
      source: { data, pageId },
      target: { data, folderId: currentFolder.id },
      projectId,
    });
  });
  return newPageId;
};

export const duplicateFolder = (folderId: Folder["id"]) => {
  const projectId = $project.get()?.id;
  const pages = $pages.get();
  const currentFolder =
    pages === undefined
      ? undefined
      : findParentFolderByChildId(folderId, pages.folders);
  if (currentFolder === undefined || projectId === undefined) {
    return;
  }
  let newFolderId: undefined | string;
  updateWebstudioData((data) => {
    const copyData = createFolderCopyData({ data, folderId });
    if (copyData) {
      newFolderId = insertFolderCopyFromDataMutable({
        source: copyData,
        target: { data, parentFolderId: currentFolder.id },
        projectId,
        forceFolderCopySuffix: true,
      });
    }
  });
  return newFolderId;
};

export const isFolder = (id: string, folders: Pages["folders"]) => {
  return folders.get(id) !== undefined;
};

type DropTarget = {
  parentId: string;
  beforeId?: string;
  afterId?: string;
  indexWithinChildren: number;
};

type TreeDropTarget = {
  parentLevel: number;
  beforeLevel?: number;
  afterLevel?: number;
};

export const getStoredDropTarget = (
  selector: string[],
  dropTarget: TreeDropTarget
): undefined | DropTarget => {
  const parentId = selector.at(-dropTarget.parentLevel - 1);
  const beforeId =
    dropTarget.beforeLevel === undefined
      ? undefined
      : selector.at(-dropTarget.beforeLevel - 1);
  const afterId =
    dropTarget.afterLevel === undefined
      ? undefined
      : selector.at(-dropTarget.afterLevel - 1);
  const pages = $pages.get();
  const parentFolder =
    parentId === undefined ? undefined : pages?.folders.get(parentId);
  let indexWithinChildren = 0;
  if (parentFolder) {
    const beforeIndex = parentFolder.children.indexOf(beforeId ?? "");
    const afterIndex = parentFolder.children.indexOf(afterId ?? "");
    if (beforeIndex > -1) {
      indexWithinChildren = beforeIndex;
    } else if (afterIndex > -1) {
      indexWithinChildren = afterIndex + 1;
    }
  }
  if (parentId) {
    return { parentId, beforeId, afterId, indexWithinChildren };
  }
};

export const canDrop = (dropTarget: DropTarget, pages: Pages) => {
  const { folders } = pages;
  // allow dropping only inside folders
  if (isFolder(dropTarget.parentId, folders) === false) {
    return false;
  }
  // forbid dropping in the beginning of root folder
  // which is always used by home page
  if (
    dropTarget.indexWithinChildren === 0 &&
    dropTarget.parentId === pages.rootFolderId
  ) {
    return false;
  }
  return true;
};

export const deleteTemplateMutable = (
  templateId: PageTemplate["id"],
  data: WebstudioData
) => {
  const template = data.pages.pageTemplates?.get(templateId);
  if (template === undefined) {
    return;
  }
  deleteRootInstanceMutable(data, template.rootInstanceId);
  data.pages.pageTemplates?.delete(templateId);
};

export const duplicateTemplate = (templateId: PageTemplate["id"]) => {
  const projectId = $project.get()?.id;
  const pages = $pages.get();
  const template = pages?.pageTemplates?.get(templateId);
  if (template === undefined || projectId === undefined) {
    return;
  }
  let newTemplateId: undefined | string;
  updateWebstudioData((data) => {
    data.pages.pageTemplates ??= new Map();
    const copyData = createTemplateCopyData({
      data,
      template,
    });
    newTemplateId = insertTemplateCopyFromFragmentsMutable({
      source: {
        template: copyData.template,
        bodyFragment: copyData.bodyFragment,
      },
      target: { data },
      projectId,
    });
  });
  return newTemplateId;
};

export const instantiateTemplate = ({
  templateId,
  overrides,
  folderId,
  contentMode,
}: {
  templateId: PageTemplate["id"];
  overrides: { name: string; path: string };
  folderId: Folder["id"];
  contentMode?: boolean;
}) => {
  const projectId = $project.get()?.id;
  if (projectId === undefined) {
    return;
  }
  let newPageId: undefined | string;
  updateWebstudioData((data) => {
    newPageId = insertPageFromTemplateMutable({
      templateId,
      source: { data },
      target: { data, folderId },
      overrides,
      projectId,
      metas: $registeredComponentMetas.get(),
      contentModeCopyableProp: isFragmentContentModeCopyableProp,
      contentMode,
    });
  });
  return newPageId;
};

export const instantiateTemplateAsNewPage = (
  templateId: PageTemplate["id"]
) => {
  const pages = $pages.get();
  const template = pages?.pageTemplates?.get(templateId);
  if (!pages || !template) {
    return;
  }

  // Deduplicate name against existing pages in the root folder
  const rootFolder = getFolderById(pages, pages.rootFolderId);
  const usedNames = new Set<string>();
  for (const childId of rootFolder?.children ?? []) {
    const page = findPageByIdOrPath(childId, pages);
    if (page) {
      usedNames.add(page.name);
    }
  }
  let name = template.name;
  let nameNum = 1;
  while (usedNames.has(name)) {
    name = `${template.name} (${nameNum})`;
    nameNum += 1;
  }

  return instantiateTemplate({
    templateId,
    overrides: { name, path: nameToPath(pages, name) },
    folderId: pages.rootFolderId,
  });
};

export const reorderTemplatesMutable = (
  sourceId: string,
  targetId: string,
  position: "before" | "after",
  data: WebstudioData
) => {
  const templates = data.pages.pageTemplates;
  if (templates === undefined || sourceId === targetId) {
    return;
  }

  const orderedTemplates = Array.from(templates.values());
  const sourceIndex = orderedTemplates.findIndex((t) => t.id === sourceId);
  if (sourceIndex === -1) {
    return;
  }

  const [sourceTemplate] = orderedTemplates.splice(sourceIndex, 1);

  const targetIndex = orderedTemplates.findIndex((t) => t.id === targetId);
  if (targetIndex === -1) {
    orderedTemplates.push(sourceTemplate);
  } else {
    const insertIndex = position === "before" ? targetIndex : targetIndex + 1;
    orderedTemplates.splice(insertIndex, 0, sourceTemplate);
  }

  templates.clear();
  for (const template of orderedTemplates) {
    templates.set(template.id, template);
  }
};
