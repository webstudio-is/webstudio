import { z } from "zod";

const instanceId = z.string();

const styleSourceId = z.string();

export const styleSourceSelection = z.object({
  instanceId: instanceId,
  values: z.array(styleSourceId),
});

export type StyleSourceSelection = z.infer<typeof styleSourceSelection>;

export const styleSourceSelections = z.map(instanceId, styleSourceSelection);

export type StyleSourceSelections = z.infer<typeof styleSourceSelections>;
