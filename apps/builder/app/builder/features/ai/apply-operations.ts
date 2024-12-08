import { nanoid } from "nanoid";
import { getStyleDeclKey, Instance, type StyleSource } from "@webstudio-is/sdk";
import { generateDataFromEmbedTemplate } from "@webstudio-is/react-sdk";
import type { copywriter, operations } from "@webstudio-is/ai";
import { serverSyncStore } from "~/shared/sync";
import { isBaseBreakpoint } from "~/shared/breakpoints";
import {
  deleteInstanceMutable,
  insertTemplateData,
  isInstanceDetachable,
  updateWebstudioData,
} from "~/shared/instance-utils";
import {
  $breakpoints,
  $instances,
  $registeredComponentMetas,
  $selectedInstanceSelector,
  $styleSourceSelections,
  $styleSources,
  $styles,
} from "~/shared/nano-states";
import type { DroppableTarget, InstanceSelector } from "~/shared/tree-utils";
import { $selectedInstance } from "~/shared/awareness";

export const applyOperations = (operations: operations.WsOperations) => {
  for (const operation of operations) {
    switch (operation.operation) {
      case "insertTemplate":
        insertTemplateByOp(operation);
        break;
      case "deleteInstance":
        deleteInstanceByOp(operation);
        break;
      case "applyStyles":
        applyStylesByOp(operation);
        break;
      default:
        if (process.env.NODE_ENV === "development") {
          console.warn(`Not supported operation: ${operation}`);
        }
    }
  }
};

const insertTemplateByOp = (
  operation: operations.generateInsertTemplateWsOperation
) => {
  const breakpoints = $breakpoints.get();
  const breakpointValues = Array.from(breakpoints.values());
  const baseBreakpoint = breakpointValues.find(isBaseBreakpoint);
  if (baseBreakpoint === undefined) {
    return false;
  }
  const metas = $registeredComponentMetas.get();
  const templateData = generateDataFromEmbedTemplate(
    operation.template,
    metas,
    baseBreakpoint.id
  );

  // @todo Find a way to avoid the workaround below, peharps improving the prompt.
  // Occasionally the LLM picks a component name or the entire data-ws-id attribute as the insertion point.
  // Instead of throwing the otherwise correct operation we try to fix this here.
  if (
    [...metas.keys()].some((componentName) =>
      componentName.includes(operation.addTo)
    )
  ) {
    const selectedInstance = $selectedInstance.get();
    if (selectedInstance) {
      operation.addTo = selectedInstance.id;
    }
  }

  const rootInstanceIds = templateData.children
    .filter((child) => child.type === "id")
    .map((child) => child.value);

  const instanceSelector = computeSelectorForInstanceId(operation.addTo);
  if (instanceSelector) {
    const currentInstance = $instances.get().get(instanceSelector[0]);
    // Only container components are allowed to have child elements.
    if (
      currentInstance &&
      metas.get(currentInstance.component)?.type !== "container"
    ) {
      return;
    }

    const dropTarget: DroppableTarget = {
      parentSelector: instanceSelector,
      position: operation.addAtIndex + 1,
    };

    insertTemplateData(templateData, dropTarget);
    return rootInstanceIds;
  }
};

const deleteInstanceByOp = (
  operation: operations.deleteInstanceWsOperation
) => {
  const instanceSelector = computeSelectorForInstanceId(operation.wsId);
  if (instanceSelector) {
    // @todo tell user they can't delete root
    if (instanceSelector.length === 1) {
      return;
    }
    updateWebstudioData((data) => {
      if (isInstanceDetachable(data.instances, instanceSelector) === false) {
        return;
      }
      deleteInstanceMutable(data, instanceSelector);
    });
  }
};

const applyStylesByOp = (operation: operations.editStylesWsOperation) => {
  serverSyncStore.createTransaction(
    [$styleSourceSelections, $styleSources, $styles, $breakpoints],
    (styleSourceSelections, styleSources, styles, breakpoints) => {
      const newStyles = [...operation.styles.values()];

      const breakpointValues = Array.from(breakpoints.values());
      const baseBreakpoint =
        breakpointValues.find(isBaseBreakpoint) ?? breakpointValues[0];

      for (const instanceId of operation.instanceIds) {
        const styleSourceSelection = styleSourceSelections.get(instanceId);
        let styleSource: StyleSource | undefined;
        let styleSourceId: string = "";

        if (styleSourceSelection) {
          for (const id of styleSourceSelection.values) {
            const candidateStyleSource = styleSources.get(id);
            if (candidateStyleSource && candidateStyleSource.type === "local") {
              styleSource = candidateStyleSource;
              styleSourceId = candidateStyleSource.id;
              break;
            }
          }
        }

        if (styleSourceId === "") {
          styleSourceId = nanoid();
        }

        if (styleSource === undefined) {
          styleSources.set(styleSourceId, { type: "local", id: styleSourceId });
        }

        if (styleSourceSelection === undefined) {
          styleSourceSelections.set(instanceId, {
            instanceId,
            values: [styleSourceId],
          });
        }

        for (const embedStyleDecl of newStyles) {
          const styleDecl = {
            ...embedStyleDecl,
            breakpointId: baseBreakpoint?.id,
            styleSourceId,
          };
          styles.set(getStyleDeclKey(styleDecl), styleDecl);
        }
      }
    }
  );
};

const computeSelectorForInstanceId = (instanceId: Instance["id"]) => {
  const selectedInstanceSelector = $selectedInstanceSelector.get();
  if (selectedInstanceSelector === undefined) {
    return;
  }

  // When the instance is the selected instance return selectedInstanceSelector right away.
  if (instanceId === selectedInstanceSelector[0]) {
    return selectedInstanceSelector;
  }

  // For a given instance to delete we compute the subtree selector between
  // that instance and the selected instance (a parent).
  let subtreeSelector: InstanceSelector = [];
  const parentInstancesById = new Map<Instance["id"], Instance["id"]>();
  for (const instance of $instances.get().values()) {
    for (const child of instance.children) {
      if (child.type === "id") {
        parentInstancesById.set(child.value, instance.id);
      }
    }
  }
  const selector: InstanceSelector = [];
  let currentInstanceId: undefined | Instance["id"] = instanceId;
  while (currentInstanceId) {
    selector.push(currentInstanceId);
    currentInstanceId = parentInstancesById.get(currentInstanceId);
    if (currentInstanceId === selectedInstanceSelector[0]) {
      subtreeSelector = [...selector, ...selectedInstanceSelector];
      break;
    }
  }

  if (subtreeSelector.length === 0) {
    return;
  }

  const parentSelector = selectedInstanceSelector.slice(1);
  // Combine the subtree selector with the selected instance one
  // to get the full and final selector.
  const combinedSelector = [...subtreeSelector, ...parentSelector];
  return combinedSelector;
};

export const patchTextInstance = (textInstance: copywriter.TextInstance) => {
  serverSyncStore.createTransaction([$instances], (instances) => {
    const currentInstance = instances.get(textInstance.instanceId);

    if (currentInstance === undefined) {
      return;
    }

    const meta = $registeredComponentMetas.get().get(currentInstance.component);

    // Only container components are allowed to have child elements.
    if (meta?.type !== "container") {
      return;
    }

    if (currentInstance.children.length === 0) {
      currentInstance.children = [{ type: "text", value: textInstance.text }];
      return;
    }

    // Instances can have a number of text child nodes without interleaving components.
    // When this is the case we treat the child nodes as a single text node,
    // otherwise the AI would generate children.length chunks of separate text.
    // We can identify this case of "joint" text instances when the index is -1.
    const replaceAll = textInstance.index === -1;
    if (replaceAll) {
      if (currentInstance.children.every((child) => child.type === "text")) {
        currentInstance.children = [{ type: "text", value: textInstance.text }];
      }
      return;
    }

    if (currentInstance.children[textInstance.index].type === "text") {
      currentInstance.children[textInstance.index].value = textInstance.text;
    }
  });
};
