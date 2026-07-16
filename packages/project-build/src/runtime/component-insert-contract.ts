import { z } from "zod";

export const componentInsertResult = z.object({
  instanceIds: z.array(z.string()),
  rootInstanceIds: z.array(z.string()),
  removedInstanceIds: z.array(z.string()),
  parentInstanceId: z.string(),
  didMergeBreakpointsDueToLimit: z.literal(true).optional(),
});

export type ComponentInsertResult = z.infer<typeof componentInsertResult>;

export const fragmentInsertResult = componentInsertResult.extend({
  parentInstanceId: z.string().optional(),
});

export type FragmentInsertResult = z.infer<typeof fragmentInsertResult>;
