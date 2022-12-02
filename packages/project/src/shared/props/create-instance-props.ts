import type { InstanceProps, UserProp } from "@webstudio-is/react-sdk";
import { v4 as uuid } from "uuid";

export const createInstanceProps = ({
  treeId,
  instanceId,
  props,
}: {
  treeId: string;
  instanceId: string;
  props?: Array<UserProp>;
}): InstanceProps => ({
  id: uuid(),
  treeId,
  instanceId,
  props: props ?? [],
});
