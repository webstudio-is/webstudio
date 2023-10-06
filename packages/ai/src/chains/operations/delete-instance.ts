import { z } from "zod";

const wsId = z.string().describe("The element's ws-id to remove");

export const aiOperation = z.object({
  operation: z.literal("deleteInstance"),
  wsId,
});
export type aiOperation = z.infer<typeof aiOperation>;

export const wsOperation = aiOperation;
export type wsOperation = z.infer<typeof wsOperation>;

export const aiOperationToWs = async (
  operation: aiOperation
): Promise<wsOperation> => operation;
