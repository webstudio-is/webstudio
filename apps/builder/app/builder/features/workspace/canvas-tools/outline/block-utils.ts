import type { WebstudioFragment } from "@webstudio-is/sdk";
import { findAllEditableInstanceSelector } from "@webstudio-is/project-build/runtime";
import {
  executeRuntimeMutationAsync,
  getWebstudioData,
} from "~/shared/instance-utils/data";
import { insertWebstudioFragmentAt } from "~/shared/instance-utils/insert";
import {
  detectFragmentTokenConflicts,
  extractWebstudioFragment,
} from "@webstudio-is/project-build/runtime";
import {
  $selectedInstanceSelector,
  selectInstance,
} from "~/shared/nano-states";
import { resolveTokenConflicts } from "~/shared/resolve-token-conflicts";
import {
  $registeredComponentMetas,
  $isContentMode,
  $textEditingInstanceSelector,
} from "~/shared/nano-states";
import { $instances } from "~/shared/sync/data-stores";
import { $project } from "~/shared/sync/data-stores";
import type {
  DroppableTarget,
  InstanceSelector,
} from "@webstudio-is/project-build/runtime";
import {
  findBlockSelector,
  getBlockTemplateInsertionIndex,
} from "@webstudio-is/project-build/runtime";

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
  getTemplateTokenConflicts,
};

export const insertListItemAt = async (listItemSelector: InstanceSelector) => {
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
  fragment.children = [{ type: "id", value: listItemInstance.id }];

  const result = await executeRuntimeMutationAsync({
    id: "instances.insertFragment",
    input: {
      parentInstanceId: target.parentSelector[0],
      fragment,
      insertIndex: target.position === "end" ? undefined : target.position,
    },
  });
  const newRootInstanceId = result?.result.rootInstanceIds[0];
  if (newRootInstanceId === undefined) {
    return;
  }
  const selectedInstanceSelector = [
    newRootInstanceId,
    ...target.parentSelector,
  ];

  $textEditingInstanceSelector.set({
    selector: selectedInstanceSelector,
    reason: "new",
  });

  selectInstance(selectedInstanceSelector);
};

export const insertTemplateAt = async (
  templateSelector: InstanceSelector,
  anchor: InstanceSelector,
  insertBefore: boolean
) => {
  const instances = $instances.get();

  const fragment = extractWebstudioFragment(
    getWebstudioData(),
    templateSelector[0]
  );

  const parentSelector = findBlockSelector({ anchor, instances });

  if (parentSelector === undefined) {
    return;
  }

  const position = getBlockTemplateInsertionIndex({
    anchor,
    instances,
    insertBefore,
  });

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
    const conflictResolution = await resolveTokenConflicts(conflicts);
    if (conflictResolution === "cancel") {
      return;
    }

    const didInsert = await insertWebstudioFragmentAt(
      fragment,
      target,
      conflictResolution,
      { contentMode }
    );
    if (didInsert === false) {
      return;
    }
    const selectedInstanceSelector = $selectedInstanceSelector.get();
    if (selectedInstanceSelector === undefined) {
      return;
    }
    const data = getWebstudioData();
    const selectors: InstanceSelector[] = [];
    findAllEditableInstanceSelector({
      instanceSelector: selectedInstanceSelector,
      instances: data.instances,
      props: data.props,
      metas: $registeredComponentMetas.get(),
      results: selectors,
    });
    const editableInstanceSelector = selectors[0];
    $textEditingInstanceSelector.set(
      editableInstanceSelector
        ? { selector: editableInstanceSelector, reason: "new" }
        : undefined
    );
  } catch {
    // User cancelled the operation
    return;
  }
};
