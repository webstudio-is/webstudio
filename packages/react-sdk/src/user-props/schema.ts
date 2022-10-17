import { z } from "zod";

export const UserProp = z.object({
  id: z.string(),
  prop: z.string(),
  value: z.union([z.string(), z.boolean()]),
  required: z.optional(z.boolean()),
});

export type UserProp = z.infer<typeof UserProp>;

export const UserProps = z.array(UserProp);
