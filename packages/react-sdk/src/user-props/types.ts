import { z } from "zod";
import type { InstanceProps, Instance } from "../db";

export const UserProp = z.object({
  id: z.string(),
  prop: z.string(),
  value: z.union([z.string(), z.boolean()]),
  required: z.optional(z.boolean()),
});

export const UserProps = z.array(UserProp);

export type UserProp = z.infer<typeof UserProp>;

export type UserPropsUpdates = {
  treeId: InstanceProps["treeId"];
  propsId: InstanceProps["id"];
  instanceId: Instance["id"];
  updates: Array<UserProp>;
};

export type DeleteProp = {
  instanceId: Instance["id"];
  propId: UserProp["id"];
};
