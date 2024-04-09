import { parseTailwindToWebstudio } from "@webstudio-is/css-data";
import type { aiOperation, wsOperation } from "./edit-styles";

export { name } from "./edit-styles";

export type { wsOperation };

export const aiOperationToWs = async (
  operation: aiOperation
): Promise<wsOperation> => {
  if (operation.className === "") {
    throw new Error(`Operation ${operation.operation} className is empty`);
  }
  const styles = await parseTailwindToWebstudio(operation.className);
  return {
    operation: "applyStyles",
    instanceIds: operation.wsIds,
    styles: styles,
  };
};
