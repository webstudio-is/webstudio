import { serverSyncStore } from "~/shared/sync";
import { generateDataFromEmbedTemplate } from "@webstudio-is/react-sdk";
import { operations } from "@webstudio-is/ai";
import { isBaseBreakpoint } from "~/shared/breakpoints";
import {
  deleteInstance as _deleteInstance,
  insertTemplateData,
} from "~/shared/instance-utils";
import {
  breakpointsStore,
  instancesStore,
  registeredComponentMetasStore,
  selectedInstanceStore,
  styleSourceSelectionsStore,
  styleSourcesStore,
  stylesStore,
} from "~/shared/nano-states";
import type { DroppableTarget } from "~/shared/tree-utils";
import { getStyleDeclKey, type StyleSource } from "@webstudio-is/sdk";
import { nanoid } from "nanoid";
import { traverseTemplate } from "@webstudio-is/jsx-utils";

export const applyOperations = (operations: operations.Response) => {
  for (const operation of operations) {
    switch (operation.operation) {
      case "insertTemplate":
        traverseTemplate(operation.template, (node) => {
          if (node.type === "instance" && node.component.startsWith("Radix.")) {
            node.component =
              "@webstudio-is/sdk-components-react-radix:" +
              node.component.slice("Radix.".length);
          }
        });
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
  operation: operations.generateInsertTemplate.wsOperation
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

  // Occasionally the LLM picks a component name as the insertion point.
  // Instead of throwing the otherwise correct operation we try to fix this here.
  if (metas.has(operation.addTo)) {
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
  operation: operations.deleteInstance.wsOperation
) => {
  _deleteInstance([operation.wsId]);
};

const applyStylesByOp = (operation: operations.editStyles.wsOperation) => {
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
