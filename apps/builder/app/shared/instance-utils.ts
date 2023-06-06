import store from "immerhin";
import {
  Instances,
  findTreeInstanceIdsExcludingSlotDescendants,
} from "@webstudio-is/project-build";
import {
  type WsEmbedTemplate,
  type WsComponentMeta,
  generateDataFromEmbedTemplate,
} from "@webstudio-is/react-sdk";
import {
  propsStore,
  stylesStore,
  selectedInstanceSelectorStore,
  styleSourceSelectionsStore,
  styleSourcesStore,
  instancesStore,
  selectedStyleSourceSelectorStore,
  textEditingInstanceSelectorStore,
  breakpointsStore,
  registeredComponentMetasStore,
} from "./nano-states";
import {
  type DroppableTarget,
  type InstanceSelector,
  findLocalStyleSourcesWithinInstances,
  insertInstancesMutable,
  reparentInstanceMutable,
  getAncestorInstanceSelector,
  insertPropsCopyMutable,
  insertStyleSourcesCopyMutable,
  insertStyleSourceSelectionsCopyMutable,
  insertStylesCopyMutable,
} from "./tree-utils";
import { removeByMutable } from "./array-utils";
import { isBaseBreakpoint } from "./breakpoints";

export const findClosestDroppableComponentIndex = (
  metas: Map<string, WsComponentMeta>,
  componentSelector: string[],
  childComponents: string[]
) => {
  const requiredAncestors = new Set<string>();
  const invalidAncestors = new Set<string>();
  for (const childComponent of childComponents) {
    const childMeta = metas.get(childComponent);
    if (childMeta?.requiredAncestors) {
      for (const ancestorComponent of childMeta.requiredAncestors) {
        requiredAncestors.add(ancestorComponent);
      }
    }
    if (childMeta?.invalidAncestors) {
      for (const ancestorComponent of childMeta.invalidAncestors) {
        invalidAncestors.add(ancestorComponent);
      }
    }
  }

  let containerIndex = -1;
  let requiredFound = false;
  for (let index = 0; index < componentSelector.length; index += 1) {
    const ancestorComponent = componentSelector[index];
    if (invalidAncestors.has(ancestorComponent) === true) {
      containerIndex = -1;
      requiredFound = false;
      continue;
    }
    if (requiredAncestors.has(ancestorComponent) === true) {
      requiredFound = true;
    }
    const ancestorMeta = metas.get(ancestorComponent);
    if (containerIndex === -1 && ancestorMeta?.type === "container") {
      containerIndex = index;
    }
  }

  if (requiredFound || requiredAncestors.size === 0) {
    return containerIndex;
  }
  return -1;
};

export const findClosestDroppableTarget = (
  metas: Map<string, WsComponentMeta>,
  instances: Instances,
  instanceSelector: InstanceSelector,
  dragComponents: string[]
): undefined | DroppableTarget => {
  const componentSelector: string[] = [];
  for (const instanceId of instanceSelector) {
    const component = instances.get(instanceId)?.component;
    if (component === undefined) {
      return;
    }
    componentSelector.push(component);
  }

  const droppableIndex = findClosestDroppableComponentIndex(
    metas,
    componentSelector,
    dragComponents
  );
  if (droppableIndex === -1) {
    return;
  }
  if (droppableIndex === 0) {
    return {
      parentSelector: instanceSelector,
      position: "end",
    };
  }

  const dropTargetSelector = instanceSelector.slice(droppableIndex);
  const dropTargetInstanceId = instanceSelector[droppableIndex];
  const dropTargetInstance = instances.get(dropTargetInstanceId);
  if (dropTargetInstance === undefined) {
    return;
  }
  const lastChildInstanceId = instanceSelector[droppableIndex - 1];
  const lastChildPosition = dropTargetInstance.children.findIndex(
    (child) => child.type === "id" && child.value === lastChildInstanceId
  );
  return {
    parentSelector: dropTargetSelector,
    position: lastChildPosition + 1,
  };
};

export const insertTemplate = (
  template: WsEmbedTemplate,
  dropTarget: DroppableTarget
) => {
  const breakpoints = breakpointsStore.get();
  const breakpointValues = Array.from(breakpoints.values());
  const baseBreakpoint = breakpointValues.find(isBaseBreakpoint);
  if (baseBreakpoint === undefined) {
    return;
  }
  const {
    children,
    instances: insertedInstances,
    props: insertedProps,
    styleSourceSelections: insertedStyleSourceSelections,
    styleSources: insertedStyleSources,
    styles: insertedStyles,
  } = generateDataFromEmbedTemplate(template, baseBreakpoint.id);
  const rootInstanceId = insertedInstances[0].id;
  store.createTransaction(
    [
      instancesStore,
      propsStore,
      styleSourceSelectionsStore,
      styleSourcesStore,
      stylesStore,
    ],
    (instances, props, styleSourceSelections, styleSources, styles) => {
      insertInstancesMutable(
        instances,
        insertedInstances,
        children,
        dropTarget
      );
      insertPropsCopyMutable(props, insertedProps, new Map());
      insertStyleSourcesCopyMutable(
        styleSources,
        insertedStyleSources,
        new Set()
      );
      insertStyleSourceSelectionsCopyMutable(
        styleSourceSelections,
        insertedStyleSourceSelections,
        new Map(),
        new Map()
      );
      insertStylesCopyMutable(styles, insertedStyles, new Map(), new Map());
    }
  );

  selectedInstanceSelectorStore.set([
    rootInstanceId,
    ...dropTarget.parentSelector,
  ]);
  selectedStyleSourceSelectorStore.set(undefined);
};

export const insertNewComponentInstance = (
  component: string,
  dropTarget: DroppableTarget
) => {
  const metas = registeredComponentMetasStore.get();
  const componentMeta = metas.get(component);
  // when template not specified fallback to template with the component
  const template = componentMeta?.template ?? [
    {
      type: "instance",
      component,
      children: [],
    },
  ];
  insertTemplate(template, dropTarget);
};

export const reparentInstance = (
  targetInstanceSelector: InstanceSelector,
  dropTarget: DroppableTarget
) => {
  store.createTransaction([instancesStore], (instances) => {
    reparentInstanceMutable(instances, targetInstanceSelector, dropTarget);
  });
  selectedInstanceSelectorStore.set(targetInstanceSelector);
  selectedStyleSourceSelectorStore.set(undefined);
};

export const deleteInstance = (instanceSelector: InstanceSelector) => {
  store.createTransaction(
    [
      instancesStore,
      propsStore,
      styleSourceSelectionsStore,
      styleSourcesStore,
      stylesStore,
    ],
    (instances, props, styleSourceSelections, styleSources, styles) => {
      let targetInstanceId = instanceSelector[0];
      const parentInstanceId = instanceSelector[1];
      const grandparentInstanceId = instanceSelector[2];
      let parentInstance =
        parentInstanceId === undefined
          ? undefined
          : instances.get(parentInstanceId);

      // delete parent fragment too if its last child is going to be deleted
      // use case for slots: slot became empty and remove display: contents
      // to be displayed properly on canvas
      if (
        parentInstance?.component === "Fragment" &&
        parentInstance.children.length === 1 &&
        grandparentInstanceId !== undefined
      ) {
        targetInstanceId = parentInstance.id;
        parentInstance = instances.get(grandparentInstanceId);
      }

      const instanceIds = findTreeInstanceIdsExcludingSlotDescendants(
        instances,
        targetInstanceId
      );
      const localStyleSourceIds = findLocalStyleSourcesWithinInstances(
        styleSources.values(),
        styleSourceSelections.values(),
        instanceIds
      );

      // may not exist when delete root
      if (parentInstance) {
        removeByMutable(
          parentInstance.children,
          (child) => child.type === "id" && child.value === targetInstanceId
        );
      }

      for (const instanceId of instanceIds) {
        instances.delete(instanceId);
      }
      // delete props and styles of deleted instance and its descendants
      for (const prop of props.values()) {
        if (instanceIds.has(prop.instanceId)) {
          props.delete(prop.id);
        }
      }
      for (const instanceId of instanceIds) {
        styleSourceSelections.delete(instanceId);
      }
      for (const styleSourceId of localStyleSourceIds) {
        styleSources.delete(styleSourceId);
      }
      for (const [styleDeclKey, styleDecl] of styles) {
        if (localStyleSourceIds.has(styleDecl.styleSourceId)) {
          styles.delete(styleDeclKey);
        }
      }

      if (parentInstance) {
        selectedInstanceSelectorStore.set(
          getAncestorInstanceSelector(instanceSelector, parentInstance.id)
        );
        selectedStyleSourceSelectorStore.set(undefined);
      }
    }
  );
};

export const deleteSelectedInstance = () => {
  const selectedInstanceSelector = selectedInstanceSelectorStore.get();
  // @todo tell user they can't delete root
  if (
    selectedInstanceSelector === undefined ||
    selectedInstanceSelector.length === 1
  ) {
    return;
  }
  deleteInstance(selectedInstanceSelector);
};

export const escapeSelection = () => {
  const selectedInstanceSelector = selectedInstanceSelectorStore.get();
  const textEditingInstanceSelector = textEditingInstanceSelectorStore.get();
  if (selectedInstanceSelector === undefined) {
    return;
  }
  // exit text editing mode first without unselecting instance
  if (textEditingInstanceSelector) {
    textEditingInstanceSelectorStore.set(undefined);
    return;
  }
  selectedInstanceSelectorStore.set(undefined);
  selectedStyleSourceSelectorStore.set(undefined);
};
