import type { Instance, Instances } from "@webstudio-is/sdk";
import { blockTemplateComponent } from "@webstudio-is/sdk";
import { shallowEqual } from "shallow-equal";
import { selectInstance } from "~/shared/awareness";
import { findAvailableVariables } from "~/shared/data-variables";
import {
  extractWebstudioFragment,
  findAllEditableInstanceSelector,
  getWebstudioData,
  insertInstanceChildrenMutable,
  insertWebstudioFragmentCopy,
  updateWebstudioData,
} from "~/shared/instance-utils";
import {
  $instances,
  $registeredComponentMetas,
  $textEditingInstanceSelector,
  findBlockChildSelector,
  findBlockSelector,
} from "~/shared/nano-states";
import type { DroppableTarget, InstanceSelector } from "~/shared/tree-utils";

const getInsertionIndex = (
  anchor: InstanceSelector,
  instances: Instances,
  insertBefore: boolean = false
) => {
  const blockSelector = findBlockSelector(anchor, instances);
  if (blockSelector === undefined) {
    return;
  }

  const insertAtInitialPosition = shallowEqual(blockSelector, anchor);

  const blockInstance = instances.get(blockSelector[0]);

  if (blockInstance === undefined) {
    return;
  }

  const childBlockSelector = findBlockChildSelector(anchor);

  if (childBlockSelector === undefined) {
    return;
  }

  const index = blockInstance.children.findIndex((child) => {
    if (child.type !== "id") {
      return false;
    }

    if (insertAtInitialPosition) {
      return instances.get(child.value)?.component === blockTemplateComponent;
    }

    return child.value === childBlockSelector[0];
  });

  if (index === -1) {
    return;
  }

  // Independent of insertBefore, we always insert after the Templates instance
  if (insertAtInitialPosition) {
    return index + 1;
  }

  return insertBefore ? index : index + 1;
};

export const insertListItemAt = (listItemSelector: InstanceSelector) => {
  const instances = $instances.get();

  const parentSelector = listItemSelector.slice(1);

  const parentInstance = instances.get(parentSelector[0]);

  if (parentInstance === undefined) {
    return;
  }

  const position =
    1 +
    parentInstance.children.findIndex(
      (child) => child.type === "id" && child.value === listItemSelector[0]
    );

  if (position === 0) {
    return;
  }

  const target: DroppableTarget = {
    parentSelector,
    position,
  };

  const fragment = extractWebstudioFragment(
    getWebstudioData(),
    listItemSelector[0]
  );

  fragment.instances = structuredClone(fragment.instances);
  fragment.instances.splice(1);
  fragment.instances[0].children = [];

  updateWebstudioData((data) => {
    const { newInstanceIds } = insertWebstudioFragmentCopy({
      data,
      fragment,
      availableVariables: findAvailableVariables({
        ...data,
        startingInstanceId: target.parentSelector[0],
      }),
    });
    const newRootInstanceId = newInstanceIds.get(fragment.instances[0].id);
    if (newRootInstanceId === undefined) {
      return;
    }
    const children: Instance["children"] = [
      { type: "id", value: newRootInstanceId },
    ];

    insertInstanceChildrenMutable(data, children, target);

    const selectedInstanceSelector = [
      newRootInstanceId,
      ...target.parentSelector,
    ];

    $textEditingInstanceSelector.set({
      selector: selectedInstanceSelector,
      reason: "new",
    });

    selectInstance(selectedInstanceSelector);
  });
};

export const insertTemplateAt = (
  templateSelector: InstanceSelector,
  anchor: InstanceSelector,
  insertBefore: boolean
) => {
  const instances = $instances.get();

  const fragment = extractWebstudioFragment(
    getWebstudioData(),
    templateSelector[0]
  );

  const parentSelector = findBlockSelector(anchor, instances);

  if (parentSelector === undefined) {
    return;
  }

  const position = getInsertionIndex(anchor, instances, insertBefore);

  if (position === undefined) {
    return;
  }

  const target: DroppableTarget = {
    parentSelector,
    position,
  };

  updateWebstudioData((data) => {
    const { newInstanceIds } = insertWebstudioFragmentCopy({
      data,
      fragment,
      availableVariables: findAvailableVariables({
        ...data,
        startingInstanceId: target.parentSelector[0],
      }),
    });
    const newRootInstanceId = newInstanceIds.get(fragment.instances[0].id);
    if (newRootInstanceId === undefined) {
      return;
    }
    const children: Instance["children"] = [
      { type: "id", value: newRootInstanceId },
    ];

    insertInstanceChildrenMutable(data, children, target);

    const selectedInstanceSelector = [
      newRootInstanceId,
      ...target.parentSelector,
    ];

    const selectors: InstanceSelector[] = [];

    findAllEditableInstanceSelector(
      selectedInstanceSelector,
      data.instances,
      $registeredComponentMetas.get(),
      selectors
    );

    const editableInstanceSelector = selectors[0];

    if (editableInstanceSelector) {
      $textEditingInstanceSelector.set({
        selector: editableInstanceSelector,
        reason: "new",
      });
    } else {
      $textEditingInstanceSelector.set(undefined);
    }

    selectInstance([newRootInstanceId, ...target.parentSelector]);
  });
};
