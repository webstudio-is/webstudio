import { z } from "zod";
import { idAttribute } from "@webstudio-is/react-sdk";

export const name = "delete-instance";

const wsId = z.string().describe(`The element's ${idAttribute} to remove`);

export const aiOperation = z.object({
  operation: z.literal("deleteInstance"),
  wsId,
});
export type aiOperation = z.infer<typeof aiOperation>;

export const wsOperation = aiOperation;
export type wsOperation = z.infer<typeof wsOperation>;
