import { serverSyncStore } from "~/shared/sync";
import { generateDataFromEmbedTemplate } from "@webstudio-is/react-sdk";
import { copywriter, type operations } from "@webstudio-is/ai";
import { isBaseBreakpoint } from "~/shared/breakpoints";
import {
  deleteInstance as _deleteInstance,
  insertTemplateData,
} from "~/shared/instance-utils";
import {
  breakpointsStore,
  instancesStore,
  registeredComponentMetasStore,
  selectedInstanceSelectorStore,
  selectedInstanceStore,
  styleSourceSelectionsStore,
  styleSourcesStore,
  stylesStore,
} from "~/shared/nano-states";
import type { DroppableTarget, InstanceSelector } from "~/shared/tree-utils";
import { getStyleDeclKey, Instance, type StyleSource } from "@webstudio-is/sdk";
import { nanoid } from "nanoid";

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
          // eslint-disable-next-line no-console
          console.warn(`Not supported operation: ${operation}`);
        }
    }
  }
};

const insertTemplateByOp = (
  operation: operations.generateInsertTemplateWsOperation
) => {
  const breakpoints = breakpointsStore.get();
  const breakpointValues = Array.from(breakpoints.values());
  const baseBreakpoint = breakpointValues.find(isBaseBreakpoint);
  if (baseBreakpoint === undefined) {
    return false;
  }
  const metas = registeredComponentMetasStore.get();
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
    const selectedInstance = selectedInstanceStore.get();
    if (selectedInstance) {
      operation.addTo = selectedInstance.id;
    }
  }

  const rootInstanceIds = templateData.children
    .filter((child) => child.type === "id")
    .map((child) => child.value);

  const dropTarget: DroppableTarget = {
    parentSelector: [operation.addTo],
    position: operation.addAtIndex + 1,
  };

  insertTemplateData(templateData, dropTarget);
  return rootInstanceIds;
};

const deleteInstanceByOp = (
  operation: operations.deleteInstanceWsOperation
) => {
  const selectedInstanceSelector = selectedInstanceSelectorStore.get();
  if (selectedInstanceSelector === undefined) {
    return;
  }

  // For a given instance to delete we compute the subtree selector between
  // that instance and the selected instance (a parent).
  let subtreeSelector: InstanceSelector = [];
  const parentInstancesById = new Map<Instance["id"], Instance["id"]>();
  for (const instance of instancesStore.get().values()) {
    for (const child of instance.children) {
      if (child.type === "id") {
        parentInstancesById.set(child.value, instance.id);
      }
    }
  }
  const selector: InstanceSelector = [];
  let currentInstanceId: undefined | Instance["id"] = operation.wsId;
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

  // Finally delete the instance by selector.
  _deleteInstance(combinedSelector);
};

const applyStylesByOp = (operation: operations.editStylesWsOperation) => {
  serverSyncStore.createTransaction(
    [
      instancesStore,
      styleSourceSelectionsStore,
      styleSourcesStore,
      stylesStore,
      breakpointsStore,
    ],
    (instances, styleSourceSelections, styleSources, styles, breakpoints) => {
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

export const patchTextInstance = (textInstance: copywriter.TextInstance) => {
  serverSyncStore.createTransaction([instancesStore], (instances) => {
    const currentInstance = instances.get(textInstance.instanceId);

    if (currentInstance === undefined) {
      return;
    }

    const meta = registeredComponentMetasStore
      .get()
      .get(currentInstance.component);

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
