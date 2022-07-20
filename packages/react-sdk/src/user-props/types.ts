import { z } from "zod";
import type { InstanceProps, Instance } from "../db";
import { UserPropSchema } from "./schema";

export type UserProp = z.infer<typeof UserPropSchema>;

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
