// Mutation utilities own changing existing instances in the live tree: delete,
// reparent, wrap, unwrap, convert, and visibility toggles. Put operations that
// move or transform existing nodes here; use insert.ts for new content and
// slot.ts for shared Slot boundary rules.
import { toast } from "@webstudio-is/design-system";
import { builderApi } from "~/shared/builder-api";
import { showAttribute } from "@webstudio-is/react-sdk";
import {
  blockComponent,
  blockTemplateComponent,
  type Instance,
  isComponentDetachable,
} from "@webstudio-is/sdk";
import {
  $isContentMode,
  $isPreviewMode,
  $registeredComponentMetas,
  $propsIndex,
  $selectedInstancePath,
  $selectedPage,
  $textEditingInstanceSelector,
  selectInstance,
} from "../nano-states";
import type { InstancePath } from "@webstudio-is/project-build/runtime";
import {
  $runtimeInstances as $instances,
  $runtimeProps as $props,
} from "../content-block-content";
import { $instanceTags } from "~/builder/features/style-panel/shared/model";
import {
  type DroppableTarget,
  type InstanceSelector,
  canDropInstanceSelector,
} from "@webstudio-is/project-build/runtime";
import { canUnwrapInstancePath } from "@webstudio-is/project-build/runtime";
import { canDeleteInstanceInContentMode } from "@webstudio-is/project-build/runtime";
import { executeRuntimeMutation, executeRuntimeMutationAsync } from "./data";
import {
  $runtimeInstances,
  $runtimeProps,
  contentBlockPresentationComponent,
  getMaterializedContentForSelectors,
  getMaterializedContentStatus,
  getMaterializedInstanceEditability,
} from "../content-block-content";
import { $publisher, subscribe } from "../pubsub";

const requestCanvasReparent = (
  sourceInstanceSelector: InstanceSelector,
  dropTarget: DroppableTarget
) => {
  const { publish } = $publisher.get();
  if (publish === undefined || window.self !== window.top) {
    return;
  }
  const requestId = window.crypto.randomUUID();
  return new Promise<boolean>((resolve) => {
    const unsubscribe = subscribe("contentBlockReparentResult", (result) => {
      if (result.requestId !== requestId) {
        return;
      }
      window.clearTimeout(timeout);
      unsubscribe();
      resolve(result.success);
    });
    const timeout = window.setTimeout(() => {
      unsubscribe();
      toast.error("The instance could not be moved.");
      resolve(false);
    }, 15_000);
    publish({
      type: "contentBlockReparentRequest",
      payload: { requestId, sourceInstanceSelector, dropTarget },
    });
  });
};

export const canReparentInstance = (
  sourceInstanceSelector: InstanceSelector,
  dropTarget: DroppableTarget
) => {
  const instances = $runtimeInstances.get();
  const source = instances.get(sourceInstanceSelector[0]);
  if (
    source?.component === blockTemplateComponent ||
    source?.component === contentBlockPresentationComponent
  ) {
    return false;
  }
  if ($isContentMode.get()) {
    const sourceIsEditable = getMaterializedInstanceEditability({
      instanceSelector: sourceInstanceSelector,
      instances,
    });
    if (
      sourceIsEditable !== true &&
      instances.get(sourceInstanceSelector[1])?.component !== blockComponent
    ) {
      return false;
    }
    const destinationRoots = getMaterializedContentForSelectors([
      dropTarget.parentSelector,
    ]);
    if (destinationRoots.length > 0) {
      const destinationIsBlock =
        instances.get(dropTarget.parentSelector[0])?.component ===
        blockComponent;
      const destinationIsEditable = getMaterializedInstanceEditability({
        instanceSelector: dropTarget.parentSelector,
        instances,
      });
      if (destinationIsBlock === false && destinationIsEditable !== true) {
        return false;
      }
      if (
        destinationRoots.some(({ identity }) => {
          const status = getMaterializedContentStatus({
            blockInstanceId: identity.blockInstanceId,
            renderScope: identity.renderScope,
          });
          return (
            status !== "ready" && status !== "empty" && status !== "pending"
          );
        })
      ) {
        return false;
      }
    } else if (
      instances.get(dropTarget.parentSelector[0])?.component !== blockComponent
    ) {
      return false;
    }
  }
  return canDropInstanceSelector({
    dragSelector: sourceInstanceSelector,
    dropSelector: dropTarget.parentSelector,
    instances,
    props: $runtimeProps.get(),
    metas: $registeredComponentMetas.get(),
    htmlTagsByInstanceId: $propsIndex.get().htmlTagsByInstanceId,
    contentMode: $isContentMode.get(),
  });
};

export const reparentInstance = (
  sourceInstanceSelector: InstanceSelector,
  dropTarget: DroppableTarget
) => {
  if (canReparentInstance(sourceInstanceSelector, dropTarget) === false) {
    toast.error("This instance cannot be moved to that location.");
    return Promise.resolve(false);
  }
  const initialRoots = getMaterializedContentForSelectors([
    sourceInstanceSelector,
    dropTarget.parentSelector,
  ]);
  if (initialRoots.length > 0) {
    const canvasResult = requestCanvasReparent(
      sourceInstanceSelector,
      dropTarget
    );
    if (canvasResult !== undefined) {
      return canvasResult;
    }
  }
  const input = { sourceInstanceSelector, dropTarget };
  const selectResult = (
    result: undefined | { result: { instanceSelector?: InstanceSelector } }
  ) => {
    if (result?.result.instanceSelector === undefined) {
      return false;
    }
    selectInstance(result.result.instanceSelector);
    return true;
  };
  const reportError = (error: unknown) => {
    toast.error(
      error instanceof Error
        ? error.message
        : "The instance could not be moved."
    );
    return false;
  };
  if (initialRoots.length === 0) {
    try {
      return Promise.resolve(
        selectResult(
          executeRuntimeMutation({
            id: "instances.reparent",
            input,
            context: { materializedContent: [] },
          })
        )
      );
    } catch (error) {
      return Promise.resolve(reportError(error));
    }
  }
  return executeRuntimeMutationAsync({
    id: "instances.reparent",
    input,
    context: { materializedContent: initialRoots },
  }).then(selectResult, reportError);
};

export const deleteInstanceBySelector = (
  instanceSelector: undefined | InstanceSelector
) => {
  if (instanceSelector === undefined || instanceSelector.length < 2) {
    return;
  }
  return executeRuntimeMutation({
    id: "instances.deleteBySelector",
    input: { instanceSelector },
  });
};

export const canUnwrapInstance = (instancePath: InstancePath) => {
  return canUnwrapInstancePath({
    instancePath,
    rootInstanceId: $selectedPage.get()?.rootInstanceId,
    instances: $instances.get(),
    props: $props.get(),
    metas: $registeredComponentMetas.get(),
  });
};

export const toggleInstanceShow = (instanceId: Instance["id"]) => {
  const showProp = Array.from($props.get().values()).find(
    (prop) => prop.instanceId === instanceId && prop.name === showAttribute
  );
  if (showProp !== undefined && showProp.type !== "boolean") {
    return;
  }
  executeRuntimeMutation({
    id: "instances.updateProps",
    input: {
      updates: [
        {
          instanceId,
          name: showAttribute,
          type: "boolean",
          value: showProp?.type === "boolean" ? !showProp.value : false,
        },
      ],
    },
  });
};

export const wrapInstance = (component: string, tag?: string) => {
  const instancePath = $selectedInstancePath.get();
  // global root or body are selected
  if (instancePath === undefined || instancePath.length === 1) {
    return;
  }
  try {
    const [selectedItem] = instancePath;
    const result = executeRuntimeMutation({
      id: "instances.wrap",
      input: {
        instanceSelector: selectedItem.instanceSelector,
        component,
        tag,
      },
    });
    if (result !== undefined) {
      selectInstance(result.result.instanceSelector);
    }
  } catch (error) {
    toast.error(
      error instanceof Error ? error.message : "Cannot wrap instance"
    );
  }
};

export const convertInstance = (component: string, tag?: string) => {
  const instancePath = $selectedInstancePath.get();
  // global root or body are selected
  if (instancePath === undefined || instancePath.length === 1) {
    return;
  }
  const instanceTags = $instanceTags.get();
  try {
    const [selectedItem] = instancePath;
    executeRuntimeMutation({
      id: "instances.convert",
      input: {
        instanceSelector: selectedItem.instanceSelector,
        component,
        tag,
        currentTag: instanceTags.get(selectedItem.instance.id),
      },
    });
  } catch (error) {
    toast.error(
      error instanceof Error ? error.message : "Cannot convert instance"
    );
  }
};

export const unwrapInstance = () => {
  const instancePath = $selectedInstancePath.get();
  if (instancePath === undefined || !canUnwrapInstance(instancePath)) {
    return;
  }
  try {
    const [selectedItem] = instancePath;
    const result = executeRuntimeMutation({
      id: "instances.unwrap",
      input: {
        instanceSelector: selectedItem.instanceSelector,
      },
    });
    if (result !== undefined) {
      selectInstance(result.result.instanceSelector);
    }
  } catch (error) {
    toast.error(
      error instanceof Error ? error.message : "Cannot unwrap instance"
    );
  }
};

export const deleteSelectedInstance = () => {
  if ($isPreviewMode.get()) {
    return;
  }
  const textEditingInstanceSelector = $textEditingInstanceSelector.get();
  const instancePath = $selectedInstancePath.get();
  // cannot delete instance while editing
  if (textEditingInstanceSelector) {
    return;
  }
  if (instancePath === undefined || instancePath.length === 1) {
    return;
  }
  const [selectedItem] = instancePath;
  const selectedInstanceSelector = selectedItem.instanceSelector;
  const instances = $instances.get();
  if (!isComponentDetachable(selectedItem.instance.component)) {
    toast.error(
      "This instance can not be moved outside of its parent component."
    );
    return false;
  }

  if ($isContentMode.get()) {
    if (
      canDeleteInstanceInContentMode({
        instanceSelector: selectedInstanceSelector,
        instances,
      }) === false
    ) {
      builderApi.toast.info("You can't delete this instance in content mode.");
      return;
    }
  }

  const result = deleteInstanceBySelector(selectedInstanceSelector);
  if (result !== undefined && result.noop === false) {
    selectInstance(result.result.instanceSelector);
  }
};
