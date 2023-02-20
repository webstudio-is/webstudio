import { z } from "zod";

const InstanceId = z.string();

const StyleSourceId = z.string();

export const StyleSourceSelection = z.object({
  instanceId: InstanceId,
  values: z.array(StyleSourceId),
});

export type StyleSourceSelection = z.infer<typeof StyleSourceSelection>;

export const StyleSourceSelectionsList = z.array(StyleSourceSelection);

export type StyleSourceSelectionsList = z.infer<
  typeof StyleSourceSelectionsList
>;

export const StyleSourceSelections = z.map(InstanceId, StyleSourceSelection);

export type StyleSourceSelections = z.infer<typeof StyleSourceSelections>;
