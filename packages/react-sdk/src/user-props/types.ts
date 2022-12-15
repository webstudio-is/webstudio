import type { InstanceProps, Instance } from "../db";
import { UserProp } from "./schema";

export type UserPropsUpdates = {
  instanceId: Instance["id"];
  propsId?: InstanceProps["id"];
  updates: Array<UserProp>;
};

export type DeleteProp = {
  instanceId: Instance["id"];
  propId: UserProp["id"];
};
