import {
  getAllPages,
  isPageTemplate,
  ROOT_INSTANCE_ID,
  getPageById,
  type Instances,
  type Pages,
} from "@webstudio-is/sdk";
import type { InstanceSelector } from "@webstudio-is/project-build/runtime";
import {
  $authToken,
  $builderMode,
  $canOpenPageTemplates,
} from "../nano-states";
import { builderUrl } from "../router-utils";
import type { BuilderView } from "../router-utils/path-utils";
import { $instances, $pages, $project } from "../sync/data-stores";
import { canResolveInstanceSelector } from "./selection";

export const getInstanceLink = (
  instanceSelector: InstanceSelector | undefined,
  { pageId, view }: { pageId?: string; view?: BuilderView } = {}
) => {
  const pages = $pages.get();
  const project = $project.get();
  if (pages === undefined || project === undefined) {
    return;
  }
  const selection = getDeepLinkedInstanceSelection({
    instanceSelector,
    pageId,
    pages,
    instances: $instances.get(),
    canOpenPageTemplates: $canOpenPageTemplates.get(),
  });
  if (selection === undefined) {
    return;
  }
  const mode = $builderMode.get();
  return builderUrl({
    ...selection,
    projectId: project.id,
    origin: window.location.origin,
    authToken: $authToken.get(),
    mode: mode === "design" ? undefined : mode,
    view,
    safemode:
      new URLSearchParams(window.location.search).get("safemode") === "true",
  });
};

export const getInstanceSelectorFromUrl = (searchParams: URLSearchParams) =>
  searchParams.get("instance")?.split(",");

export const getDeepLinkedInstanceSelection = ({
  instanceSelector,
  pageId,
  canOpenPageTemplates,
  pages,
  instances,
}: {
  instanceSelector: InstanceSelector | undefined;
  pageId?: string;
  canOpenPageTemplates: boolean;
  pages: Pages;
  instances: Instances;
}) => {
  if (instanceSelector === undefined) {
    return;
  }

  const instanceId = instanceSelector[0];
  const isGlobalRoot =
    instanceSelector.length === 1 && instanceId === ROOT_INSTANCE_ID;
  if (
    instanceId === undefined ||
    (!isGlobalRoot && instances.has(instanceId) === false) ||
    canResolveInstanceSelector(instanceSelector, instances) === false
  ) {
    return;
  }

  const page =
    isGlobalRoot && pageId !== undefined
      ? (getPageById(pages, pageId) ?? pages.pageTemplates?.get(pageId))
      : getAllPages(pages).find(
          (page) => page.rootInstanceId === instanceSelector.at(-1)
        );
  if (
    page === undefined ||
    (isPageTemplate(page) && canOpenPageTemplates === false)
  ) {
    return;
  }
  return { pageId: page.id, instanceSelector };
};
