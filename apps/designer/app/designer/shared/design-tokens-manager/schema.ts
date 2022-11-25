import { z } from "zod";
import { groups } from "./groups";

type Type = typeof groups[number]["type"];
type Group = typeof groups[number]["group"];

const types: Array<Type> = groups.map((group) => group.type);
const groupNames: Array<Group> = groups.map((group) => group.group);

export const DesignToken = z.object({
  name: z.string(),
  // @todo
  type: z.enum(types as any),
  value: z.string(),
  description: z.optional(z.string()),
  // @todo
  group: z.enum(groupNames as any),
});

export type DesignToken = z.infer<typeof DesignToken>;
