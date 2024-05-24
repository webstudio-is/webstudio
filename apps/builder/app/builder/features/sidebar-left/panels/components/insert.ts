import { type WsComponentMeta } from "@webstudio-is/react-sdk";
import { toast } from "@webstudio-is/design-system";
import {
  $instances,
  $registeredComponentMetas,
  $selectedInstanceSelector,
  $selectedPage,
} from "~/shared/nano-states";
import {
  computeInstancesConstraints,
  findClosestDroppableTarget,
  getComponentTemplateData,
  insertTemplateData,
} from "~/shared/instance-utils";

const formatInsertionError = (component: string, meta: WsComponentMeta) => {
  const or = new Intl.ListFormat("en", {
    type: "disjunction",
  });
  const and = new Intl.ListFormat("en", {
    type: "conjunction",
  });
  const messages: string[] = [];
  if (meta.requiredAncestors) {
    const listString = or.format(meta.requiredAncestors);
    messages.push(`can be added only inside of ${listString}`);
  }
  if (meta.invalidAncestors) {
    const listString = and.format(meta.invalidAncestors);
    messages.push(`cannot be added inside of ${listString}`);
  }
  return `${component} ${and.format(messages)}`;
};

// Insert a component depending on currently selected instance.
// Used for 1-click insert from the components panel.
export const insert = (component: string) => {
  const selectedPage = $selectedPage.get();
  if (selectedPage === undefined) {
    return;
  }
  const templateData = getComponentTemplateData(component);
  if (templateData === undefined) {
    return;
  }
  const newInstances = new Map(
    templateData.instances.map((instance) => [instance.id, instance])
  );
  const rootInstanceIds = templateData.children
    .filter((child) => child.type === "id")
    .map((child) => child.value);
  const instanceSelector = $selectedInstanceSelector.get() ?? [
    selectedPage.rootInstanceId,
  ];
  const metas = $registeredComponentMetas.get();
  const dropTarget = findClosestDroppableTarget(
    metas,
    $instances.get(),
    // fallback to root as drop target
    instanceSelector,
    computeInstancesConstraints(metas, newInstances, rootInstanceIds)
  );
  if (dropTarget === undefined) {
    const meta = metas.get(component);
    if (meta) {
      toast.error(formatInsertionError(component, meta));
    }
    return;
  }
  insertTemplateData(templateData, dropTarget);
};
