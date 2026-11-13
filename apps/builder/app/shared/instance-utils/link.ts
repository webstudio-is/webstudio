import {
  getAllPages,
  isPageTemplate,
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
import { $instances, $pages, $project } from "../sync/data-stores";
import { canResolveInstanceSelector } from "./selection";

export const getInstanceLink = (
  instanceSelector: InstanceSelector | undefined
) => {
  const pages = $pages.get();
  const project = $project.get();
  if (pages === undefined || project === undefined) {
    return;
  }
  const selection = getDeepLinkedInstanceSelection({
    instanceSelector,
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
    safemode:
      new URLSearchParams(window.location.search).get("safemode") === "true",
  });
};

export const getInstanceSelectorFromUrl = (searchParams: URLSearchParams) =>
  searchParams.get("instance")?.split(",");

export const getDeepLinkedInstanceSelection = ({
  instanceSelector,
  canOpenPageTemplates,
  pages,
  instances,
}: {
  instanceSelector: InstanceSelector | undefined;
  canOpenPageTemplates: boolean;
  pages: Pages;
  instances: Instances;
}) => {
  if (instanceSelector === undefined) {
    return;
  }

  const instanceId = instanceSelector[0];
  if (
    instanceId === undefined ||
    instances.has(instanceId) === false ||
    canResolveInstanceSelector(instanceSelector, instances) === false
  ) {
    return;
  }

  const rootInstanceId = instanceSelector.at(-1);
  const page = getAllPages(pages).find(
    (page) => page.rootInstanceId === rootInstanceId
  );
  if (
    page === undefined ||
    (isPageTemplate(page) && canOpenPageTemplates === false)
  ) {
    return;
  }
  return { pageId: page.id, instanceSelector };
};
