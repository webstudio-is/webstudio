import {
  camelCaseProperty,
  parseTailwindToWebstudio,
} from "@webstudio-is/css-data";
import type { aiOperation, wsOperation } from "./edit-styles";

export { name } from "./edit-styles";

export type { wsOperation };

export const aiOperationToWs = async (
  operation: aiOperation
): Promise<wsOperation> => {
  if (operation.className === "") {
    throw new Error(`Operation ${operation.operation} className is empty`);
  }
  const hyphenatedStyles = await parseTailwindToWebstudio(operation.className);
  const newStyles = hyphenatedStyles.map(({ property, ...styleDecl }) => ({
    ...styleDecl,
    property: camelCaseProperty(property),
  }));
  return {
    operation: "applyStyles",
    instanceIds: operation.wsIds,
    styles: newStyles,
  };
};
