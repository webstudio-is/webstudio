import type { InstanceProps, Instance } from "../db";
import { UserProp } from "./schema";

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
