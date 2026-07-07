import type { Instance, Instances, WebstudioFragment } from "@webstudio-is/sdk";
import { findAllEditableInstanceSelector } from "~/shared/instance-utils/lookup";
import {
  getWebstudioData,
  updateWebstudioData,
} from "~/shared/instance-utils/data";
import { insertInstanceChildrenMutable } from "~/shared/instance-utils/insert";
import {
  detectFragmentTokenConflicts,
  extractWebstudioFragment,
  insertWebstudioFragmentCopy,
} from "@webstudio-is/project-build/runtime/fragment";
import { blockTemplateComponent } from "@webstudio-is/sdk";
import { shallowEqual } from "shallow-equal";
import { selectInstance } from "~/shared/nano-states";
import { builderApi } from "~/shared/builder-api";
import { findAvailableVariables } from "@webstudio-is/project-build/runtime/data";
import { isFragmentContentModeCopyableProp } from "~/shared/content-mode-copy-policy";
import {
  $registeredComponentMetas,
  $isContentMode,
  $textEditingInstanceSelector,
  findBlockChildSelector,
  findBlockSelector,
} from "~/shared/nano-states";
import { $instances } from "~/shared/sync/data-stores";
import { $project } from "~/shared/sync/data-stores";
import type {
  DroppableTarget,
  InstanceSelector,
} from "~/shared/instance-utils/tree";

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

const getTemplateTokenConflicts = ({
  fragment,
  targetData,
  contentMode,
  detect = detectFragmentTokenConflicts,
}: {
  fragment: WebstudioFragment;
  targetData: ReturnType<typeof getWebstudioData>;
  contentMode: boolean;
  detect?: typeof detectFragmentTokenConflicts;
}) => {
  if (contentMode) {
    return [];
  }
  return detect({ fragment, targetData });
};

export const __testing__ = {
  getInsertionIndex,
  getTemplateTokenConflicts,
};

export const insertListItemAt = (listItemSelector: InstanceSelector) => {
  const project = $project.get();
  const instances = $instances.get();
  if (project === undefined) {
    return;
  }

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

  const [listItemInstance] = fragment.instances;
  if (listItemInstance === undefined) {
    return;
  }
  fragment.instances = [{ ...listItemInstance, children: [] }];

  updateWebstudioData((data) => {
    const { newInstanceIds } = insertWebstudioFragmentCopy({
      data,
      fragment,
      availableVariables: findAvailableVariables({
        ...data,
        startingInstanceId: target.parentSelector[0],
      }),
      projectId: project.id,
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

export const insertTemplateAt = async (
  templateSelector: InstanceSelector,
  anchor: InstanceSelector,
  insertBefore: boolean
) => {
  const project = $project.get();
  const instances = $instances.get();
  if (project === undefined) {
    return;
  }

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

  try {
    const contentMode = $isContentMode.get();
    const conflicts = getTemplateTokenConflicts({
      fragment,
      targetData: getWebstudioData(),
      contentMode,
    });
    const conflictResolution =
      conflicts.length > 0
        ? await builderApi.showTokenConflictDialog(conflicts)
        : "theirs";

    updateWebstudioData((data) => {
      const { newInstanceIds } = insertWebstudioFragmentCopy({
        data,
        fragment,
        availableVariables: findAvailableVariables({
          ...data,
          startingInstanceId: target.parentSelector[0],
        }),
        projectId: project.id,
        conflictResolution,
        metas: $registeredComponentMetas.get(),
        contentModeCopyableProp: isFragmentContentModeCopyableProp,
        contentMode,
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

      findAllEditableInstanceSelector({
        instanceSelector: selectedInstanceSelector,
        instances: data.instances,
        props: data.props,
        metas: $registeredComponentMetas.get(),
        results: selectors,
      });

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
  } catch {
    // User cancelled the operation
    return;
  }
};
