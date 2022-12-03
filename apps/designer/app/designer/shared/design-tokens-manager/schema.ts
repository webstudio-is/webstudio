import { z } from "zod";
import { groups } from "./groups";

type Type = typeof groups[number]["type"];
type Group = typeof groups[number]["group"];

const types = groups.map((group) => group.type) as unknown as readonly [Type];
const groupNames = groups.map((group) => group.group) as unknown as readonly [
  Group
];

export const DesignToken = z.object({
  name: z.string(),
  type: z.enum(types),
  value: z.string(),
  description: z.optional(z.string()),
  group: z.enum(groupNames),
});

export type DesignToken = z.infer<typeof DesignToken>;
