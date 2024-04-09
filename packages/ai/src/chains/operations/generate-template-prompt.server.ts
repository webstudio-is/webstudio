import type { aiOperation, wsOperation } from "./generate-template-prompt";

export { name } from "./generate-template-prompt";

export type { wsOperation };

export const aiOperationToWs = async (
  operation: aiOperation
): Promise<wsOperation> => operation;
