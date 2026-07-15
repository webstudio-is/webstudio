import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { computed } from "nanostores";
import {
  type Page,
  type PageTemplate,
  type Folder,
  type Pages,
  findPageByIdOrPath,
  findParentFolderByChildId,
  getFolderById,
  encodeDataSourceVariable,
  ROOT_INSTANCE_ID,
  systemParameter,
  SYSTEM_VARIABLE_ID,
  isPageDraft,
} from "@webstudio-is/sdk";
import { $variableValuesByInstanceSelector } from "~/shared/nano-states";
import { $dataSources, $pages, $project } from "~/shared/sync/data-stores";
import { nameToPath } from "@webstudio-is/project-build/runtime";
import { $selectedPage, getInstanceKey } from "~/shared/nano-states";

export const getPageDisplayName = (page: Page) =>
  isPageDraft(page) ? `[Draft] ${page.name}` : page.name;

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
  const result = executeRuntimeMutation({
    id: "pages.duplicate",
    input: {
      projectId,
      pageId,
      parentFolderId: currentFolder.id,
    },
  });
  return result?.result.pageId;
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
  const result = executeRuntimeMutation({
    id: "folders.duplicate",
    input: {
      projectId,
      folderId,
      parentFolderId: currentFolder.id,
    },
  });
  return result?.result.folderId;
};

export const isFolder = (id: string, folders: Pages["folders"]) => {
  return folders.get(id) !== undefined;
};

export const duplicateTemplate = (templateId: PageTemplate["id"]) => {
  const projectId = $project.get()?.id;
  if (projectId === undefined) {
    return;
  }
  const result = executeRuntimeMutation({
    id: "pageTemplates.duplicate",
    input: {
      projectId,
      templateId,
    },
  });
  return result?.result.templateId;
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
  const result = executeRuntimeMutation({
    id: "pageTemplates.createPage",
    input: {
      projectId,
      templateId,
      parentFolderId: folderId,
      name: overrides.name,
      path: overrides.path,
      contentMode,
    },
  });
  return result?.result.pageId;
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
