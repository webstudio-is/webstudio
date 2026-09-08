import {
  getAllPages,
  isPageTemplate,
  type Instances,
  type Pages,
} from "@webstudio-is/sdk";
import type { InstanceSelector } from "@webstudio-is/project-build/runtime";
import { canResolveInstanceSelector } from "../instance-utils/selection";

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
