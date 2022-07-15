import { z } from "zod";

export const UserPropSchema = z.object({
  id: z.string(),
  prop: z.string(),
  value: z.union([z.string(), z.boolean()]),
  required: z.optional(z.boolean()),
});

export const UserPropsSchema = z.array(UserPropSchema);
