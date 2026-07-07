// Insert utilities own deciding where newly created or pasted instance content
// should be placed. Put insert target resolution and insertion commands here,
// while fragment cloning stays in fragment.ts and existing-instance moves stay
// in mutation.ts.
import { nanoid } from "nanoid";
import { toast } from "@webstudio-is/design-system";
import {
  type Instance,
  type WebstudioData,
  type WebstudioFragment,
  ROOT_INSTANCE_ID,
  collectionComponent,
  elementComponent,
  tags,
} from "@webstudio-is/sdk";
import type { ConflictResolution } from "../token-conflict-dialog";
import {
  $registeredComponentMetas,
  $registeredTemplates,
  $selectedInstancePath,
  $selectedInstanceSelector,
  $selectedPage,
  getInstancePath,
  selectInstance,
} from "../nano-states";
import { $instances, $project, $props } from "../sync/data-stores";
import { findClosestInstanceMatchingFragment } from "../matcher";
import {
  findClosestNonTextualContainer,
  isTreeSatisfyingContentModel,
} from "../content-model";
import { findAvailableVariables } from "@webstudio-is/project-build/runtime/data";
import { getInstanceLabel } from "~/builder/shared/instance-label";
import { getSlotFragmentDropTargetMutable } from "./slot";
import {
  type DroppableTarget,
  type InstanceSelector,
  wrapEditableChildrenAroundDropTargetMutable,
} from "./tree";
import { updateWebstudioData } from "./data";
import { insertWebstudioFragmentCopy } from "@webstudio-is/project-build/runtime/fragment";

const getExistingInsertTargetPath = (insertable: Insertable) => {
  const instancePath = getInstancePath(
    insertable.parentSelector,
    $instances.get()
  );
  if (instancePath === undefined) {
    toast.error("Cannot insert: the target no longer exists.");
    return;
  }
  return instancePath;
};

export const insertInstanceChildrenMutable = (
  data: Omit<WebstudioData, "pages">,
  children: Instance["children"],
  insertTarget: Insertable
) => {
  const dropTarget: DroppableTarget = {
    parentSelector: insertTarget.parentSelector,
    position: insertTarget.position === "after" ? "end" : insertTarget.position,
  };
  const metas = $registeredComponentMetas.get();
  let normalizedDropTarget =
    getSlotFragmentDropTargetMutable(data.instances, dropTarget) ?? dropTarget;
  normalizedDropTarget =
    wrapEditableChildrenAroundDropTargetMutable(
      data.instances,
      data.props,
      metas,
      normalizedDropTarget
    ) ?? normalizedDropTarget;
  const [parentInstanceId] = normalizedDropTarget.parentSelector;
  const parentInstance = data.instances.get(parentInstanceId);
  if (parentInstance === undefined) {
    return;
  }
  if (normalizedDropTarget.position === "end") {
    parentInstance.children.push(...children);
  } else {
    parentInstance.children.splice(
      normalizedDropTarget.position,
      0,
      ...children
    );
  }
};

export const insertWebstudioElementAt = (insertable?: Insertable) => {
  const instances = $instances.get();
  const props = $props.get();
  const metas = $registeredComponentMetas.get();
  // find closest container and try to match new element with it
  if (insertable === undefined) {
    const instancePath = $selectedInstancePath.get();
    if (instancePath === undefined) {
      return false;
    }
    const [{ instanceSelector }] = instancePath;
    const containerSelector = findClosestNonTextualContainer({
      instances,
      props,
      metas,
      instanceSelector,
    });
    const insertableIndex = instanceSelector.length - containerSelector.length;
    if (insertableIndex === 0) {
      insertable = {
        parentSelector: containerSelector,
        position: "end",
      };
    } else {
      const containerInstance = instances.get(containerSelector[0]);
      if (containerInstance === undefined) {
        return false;
      }
      const lastChildInstanceId = instanceSelector[insertableIndex - 1];
      const lastChildPosition = containerInstance.children.findIndex(
        (child) => child.type === "id" && child.value === lastChildInstanceId
      );
      insertable = {
        parentSelector: containerSelector,
        position: lastChildPosition + 1,
      };
    }
  }
  if (getExistingInsertTargetPath(insertable) === undefined) {
    return false;
  }
  // create element and find matching tag
  const element: Instance = {
    type: "instance",
    id: nanoid(),
    component: elementComponent,
    children: [],
  };
  const newInstances = new Map(instances);
  newInstances.set(element.id, element);
  let matchingTag: undefined | string;
  for (const tag of tags) {
    element.tag = tag;
    const isSatisfying = isTreeSatisfyingContentModel({
      instances: newInstances,
      props,
      metas,
      instanceSelector: [element.id, ...insertable.parentSelector],
    });
    if (isSatisfying) {
      matchingTag = tag;
      break;
    }
  }
  if (matchingTag === undefined) {
    return false;
  }
  // insert element
  updateWebstudioData((data) => {
    data.instances.set(element.id, element);
    const children: Instance["children"] = [{ type: "id", value: element.id }];
    insertInstanceChildrenMutable(data, children, insertable);
  });
  selectInstance([element.id, ...insertable.parentSelector]);
  return true;
};

export const insertWebstudioFragmentAt = (
  fragment: WebstudioFragment,
  insertable?: Insertable,
  conflictResolution?: ConflictResolution,
  options?: { onBreakpointLimitMerge?: () => void }
): boolean => {
  const hasChildren = fragment.children.length > 0;
  const hasTokens = fragment.styleSources.length > 0;
  if (!hasChildren && !hasTokens) {
    return false;
  }
  // Tokens-only fragment: insert tokens/breakpoints/styles without instances
  if (!hasChildren && hasTokens) {
    const project = $project.get();
    if (project === undefined) {
      return false;
    }
    updateWebstudioData((data) => {
      insertWebstudioFragmentCopy({
        data,
        fragment,
        availableVariables: [],
        projectId: project.id,
        conflictResolution,
        onBreakpointLimitMerge: options?.onBreakpointLimitMerge,
      });
    });
    return true;
  }
  const project = $project.get();
  insertable = findClosestInsertable(fragment, insertable) ?? insertable;
  if (project === undefined || insertable === undefined) {
    return false;
  }
  const initialInstancePath = getExistingInsertTargetPath(insertable);
  if (initialInstancePath === undefined) {
    return false;
  }
  let newInstanceSelector: undefined | InstanceSelector;
  updateWebstudioData((data) => {
    const instancePath =
      getInstancePath(insertable.parentSelector, data.instances) ??
      initialInstancePath;
    const { newInstanceIds } = insertWebstudioFragmentCopy({
      data,
      fragment,
      availableVariables: findAvailableVariables({
        ...data,
        startingInstanceId: instancePath[0].instance.id,
      }),
      projectId: project.id,
      conflictResolution,
      onBreakpointLimitMerge: options?.onBreakpointLimitMerge,
    });
    const children: Instance["children"] = fragment.children.map((child) => {
      if (child.type === "id") {
        return {
          type: "id",
          value: newInstanceIds.get(child.value) ?? child.value,
        };
      }
      return child;
    });
    let parentSelector;
    let position: number | "end";
    if (insertable.position === "after") {
      if (instancePath.length === 1) {
        parentSelector = insertable.parentSelector;
        position = "end";
      } else {
        parentSelector = instancePath[1].instanceSelector;
        const [{ instance }, { instance: parentInstance }] = instancePath;
        const index = parentInstance.children.findIndex(
          (child) => child.type === "id" && child.value === instance.id
        );
        position = 1 + index;
      }
    } else {
      parentSelector = insertable.parentSelector;
      position = insertable.position;
    }
    insertInstanceChildrenMutable(data, children, {
      parentSelector,
      position,
    });
    newInstanceSelector = [children[0].value, ...parentSelector];
  });
  if (newInstanceSelector) {
    selectInstance(newInstanceSelector);
  }
  return true;
};

export const getComponentTemplateData = (
  componentOrTemplate: string
): WebstudioFragment => {
  const templates = $registeredTemplates.get();
  const templateMeta = templates.get(componentOrTemplate);
  if (templateMeta) {
    return templateMeta.template;
  }
  const newInstance: Instance = {
    id: nanoid(),
    type: "instance",
    component: componentOrTemplate,
    children: [],
  };
  return {
    children: [{ type: "id", value: newInstance.id }],
    instances: [newInstance],
    props: [],
    dataSources: [],
    styleSourceSelections: [],
    styleSources: [],
    styles: [],
    breakpoints: [],
    assets: [],
    resources: [],
  };
};

export type Insertable = {
  parentSelector: InstanceSelector;
  position: number | "end" | "after";
};

export const findClosestInsertable = (
  fragment: WebstudioFragment,
  from?: Insertable
): undefined | Insertable => {
  const selectedPage = $selectedPage.get();
  if (selectedPage === undefined) {
    return;
  }
  // paste to the page root if nothing is selected
  const instanceSelector = from?.parentSelector ??
    $selectedInstanceSelector.get() ?? [selectedPage.rootInstanceId];
  if (instanceSelector[0] === ROOT_INSTANCE_ID) {
    toast.error(`Cannot insert into Global root`);
    return;
  }
  const metas = $registeredComponentMetas.get();
  const instances = $instances.get();
  const props = $props.get();
  const containerSelector = findClosestNonTextualContainer({
    metas,
    props,
    instances,
    instanceSelector,
  });
  const closestContainerIndex =
    instanceSelector.length - containerSelector.length;
  if (closestContainerIndex === -1) {
    return;
  }
  let insertableIndex = findClosestInstanceMatchingFragment({
    metas,
    instances,
    props,
    instanceSelector: instanceSelector.slice(closestContainerIndex),
    fragment,
    onError: (message) => {
      const component = fragment.instances[0].component;
      const label = getInstanceLabel({ component });
      toast.warn(message || `"${label}" has no place here`);
    },
  });
  if (insertableIndex === -1) {
    return;
  }

  // adjust with container lookup
  insertableIndex = insertableIndex + closestContainerIndex;
  const parentSelector = instanceSelector.slice(insertableIndex);
  if (insertableIndex === 0) {
    return from ?? { parentSelector, position: "end" };
  }
  const instance = instances.get(instanceSelector[insertableIndex]);
  if (instance === undefined) {
    return;
  }
  // skip collection item when inserting something and go straight into collection instance
  if (instance?.component === collectionComponent && insertableIndex === 1) {
    return {
      parentSelector,
      position: "end",
    };
  }
  const lastChildInstanceId = instanceSelector[insertableIndex - 1];
  const lastChildPosition = instance.children.findIndex(
    (child) => child.type === "id" && child.value === lastChildInstanceId
  );
  return {
    parentSelector,
    position: lastChildPosition + 1,
  };
};
