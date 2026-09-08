import type { InstanceSelector } from "@webstudio-is/project-build/runtime";
import {
  $authToken,
  $builderMode,
  $canOpenPageTemplates,
} from "../nano-states";
import { builderUrl } from "../router-utils";
import { $instances, $pages, $project } from "../sync/data-stores";
import { getDeepLinkedInstanceSelection } from "./selection";

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
