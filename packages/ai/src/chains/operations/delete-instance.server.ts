import type { aiOperation, wsOperation } from "./delete-instance";

export { name } from "./delete-instance";

export type { wsOperation };

export const aiOperationToWs = async (
  operation: aiOperation
): Promise<wsOperation> => operation;
