import { z } from "zod";
import { designTokensGroups } from "./groups";

type Type = typeof designTokensGroups[number]["type"];
type Group = typeof designTokensGroups[number]["group"];

const types = designTokensGroups.map(
  (group) => group.type
) as unknown as readonly [Type];
const groupNames = designTokensGroups.map(
  (group) => group.group
) as unknown as readonly [Group];

export const DesignToken = z.object({
  name: z.string(),
  type: z.enum(types),
  value: z.string(),
  description: z.optional(z.string()),
  group: z.enum(groupNames),
});

export type DesignToken = z.infer<typeof DesignToken>;
