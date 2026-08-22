import type { WebstudioFragment } from "@webstudio-is/sdk";
import {
  detectFragmentTokenConflicts,
  extractWebstudioFragment,
  findBlockSelector,
  findTextEditorTarget,
  getBlockTemplateInsertionIndex,
  getContentStorageProtectedChildCount,
  getSourceBackedBlockTemplateContext,
  createContentStorageProjection,
  type MaterializedContentRoot,
  serializeMdxTemplateInsertion,
  type DroppableTarget,
  type InstanceSelector,
} from "@webstudio-is/project-build/runtime";
import {
  executeRuntimeMutationAsync,
  getRuntimeWebstudioData,
  getWebstudioData,
} from "~/shared/instance-utils/data";
import { insertWebstudioFragmentAt } from "~/shared/instance-utils/insert";
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
import { $project } from "~/shared/sync/data-stores";
import { getInstanceKey } from "~/shared/nano-states/instances";
import {
  $runtimeInstances,
  $runtimeProps,
  getRuntimeInstanceChildren,
} from "~/shared/content-block-content";
import { createBuilderContentBlockSourceController } from "~/builder/features/settings-panel/controls/content-block-source-controller";
import { toast } from "@webstudio-is/design-system";
import { $publisher } from "~/shared/pubsub";

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

const getPersistedInsertionInstanceId = ({
  root,
  insertIndex,
  transientInstanceId,
}: {
  root: MaterializedContentRoot | undefined;
  insertIndex: number;
  transientInstanceId: string;
}) => {
  const child = root?.fragment.children[insertIndex];
  return child?.type === "id" ? child.value : transientInstanceId;
};

export const __testing__ = {
  getTemplateTokenConflicts,
  getPersistedInsertionInstanceId,
};

export const insertListItemAt = async (listItemSelector: InstanceSelector) => {
  const project = $project.get();
  const instances = $runtimeInstances.get();
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
    getRuntimeWebstudioData(),
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
  const projectData = getWebstudioData();
  const instances = $runtimeInstances.get();

  const parentSelector = findBlockSelector({ anchor, instances });

  if (parentSelector === undefined) {
    return;
  }

  const block = instances.get(parentSelector[0]);
  if (block === undefined) {
    return;
  }
  const scopedInstances = new Map(instances).set(block.id, {
    ...block,
    children: getRuntimeInstanceChildren(block, parentSelector),
  });
  const position = getBlockTemplateInsertionIndex({
    anchor,
    instances: scopedInstances,
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
    const sourceContext = getSourceBackedBlockTemplateContext({
      templateInstanceId: templateSelector[0],
      instances: projectData.instances,
      props: projectData.props.values(),
    });
    if (contentMode && sourceContext?.blockInstanceId === parentSelector[0]) {
      const project = $project.get();
      if (project === undefined) {
        return;
      }
      const renderScope = getInstanceKey(parentSelector);
      const controller = createBuilderContentBlockSourceController({
        blockInstanceId: sourceContext.blockInstanceId,
        renderScope,
        projectId: project.id,
      });
      try {
        const sourceState = await controller.open(sourceContext.source);
        if ("root" in sourceState === false) {
          toast.error("The MDX content source is not ready for editing.");
          return;
        }
        const protectedChildCount = getContentStorageProtectedChildCount({
          state: projectData,
          root: { type: "external", identity: sourceState.root.identity },
          parentInstanceId: sourceContext.blockInstanceId,
        });
        const templateFragment = extractWebstudioFragment(
          projectData,
          sourceContext.templateInstanceId
        );
        const source = await serializeMdxTemplateInsertion({
          identity: sourceState.root.identity,
          fragment: templateFragment,
          templateName: sourceContext.templateName,
        });
        const authoredInsertIndex = Math.max(0, position - protectedChildCount);
        const result = await executeRuntimeMutationAsync({
          id: "instances.insertMdxText",
          input: {
            parentInstanceId: sourceContext.blockInstanceId,
            source,
            insertIndex: authoredInsertIndex,
          },
          context: { materializedContent: [sourceState.root] },
        });
        const insertedInstanceId = result?.result.rootInstanceIds[0];
        if (insertedInstanceId === undefined) {
          return;
        }
        const savedState = controller.getSessionState();
        const newInstanceId = getPersistedInsertionInstanceId({
          root:
            savedState !== undefined && "root" in savedState
              ? savedState.root
              : undefined,
          insertIndex: authoredInsertIndex,
          transientInstanceId: insertedInstanceId,
        });
        const selectedInstanceSelector = [newInstanceId, ...parentSelector];
        const projectedState =
          savedState !== undefined && "root" in savedState
            ? createContentStorageProjection({
                state: projectData,
                materializedRoots: [savedState.root],
              }).state
            : undefined;
        const editableInstanceSelector = findTextEditorTarget({
          instanceSelector: selectedInstanceSelector,
          instances: projectedState?.instances ?? $runtimeInstances.get(),
          props: projectedState?.props ?? $runtimeProps.get(),
          metas: $registeredComponentMetas.get(),
        });
        $publisher.get().publish?.({
          type: "contentBlockSourceReload",
          payload: {
            projectId: project.id,
            blockInstanceId: sourceContext.blockInstanceId,
            renderScope,
            root:
              savedState !== undefined && "root" in savedState
                ? savedState.root
                : undefined,
            diagnostics: savedState?.diagnostics ?? [],
            editingInstanceSelector: editableInstanceSelector,
          },
        });
        selectInstance(selectedInstanceSelector);
        return;
      } finally {
        controller.dispose();
      }
    }
    const fragment = extractWebstudioFragment(projectData, templateSelector[0]);
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
    const editableInstanceSelector = findTextEditorTarget({
      instanceSelector: selectedInstanceSelector,
      instances: data.instances,
      props: data.props,
      metas: $registeredComponentMetas.get(),
    });
    $textEditingInstanceSelector.set(
      editableInstanceSelector
        ? { selector: editableInstanceSelector, reason: "new" }
        : undefined
    );
  } catch (error) {
    toast.error(
      error instanceof Error
        ? error.message
        : "The Content Block template could not be inserted."
    );
  }
};
