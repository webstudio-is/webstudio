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
  name: z
    .string()
    .refine((name) => name.trim().length !== 0, "Name can't be empty"),
  type: z.enum(types),
  value: z
    .string()
    .refine((value) => value.trim().length !== 0, "Value can't be empty"),
  description: z.optional(z.string()),
  group: z.enum(groupNames),
});

export type DesignToken = z.infer<typeof DesignToken>;

export const DesignTokens = z.array(DesignToken).refine((tokens) => {
  const names = tokens.map((token) => token.name);
  return new Set(names).size === names.length;
}, "Name must be unique");

export type DesignTokens = z.infer<typeof DesignTokens>;
