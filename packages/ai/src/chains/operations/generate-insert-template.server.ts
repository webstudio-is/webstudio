import { jsxToTemplate } from "../../utils/jsx-to-template.server";
import type { aiOperation, wsOperation } from "./generate-insert-template";

export type { wsOperation };

export const aiOperationToWs = async (
  operation: aiOperation
): Promise<wsOperation> => {
  return {
    operation: "insertTemplate",
    addTo: operation.addTo,
    addAtIndex: operation.addAtIndex,
    template: await jsxToTemplate(operation.jsx),
  };
};
