import ObjectId from "bson-objectid";
import produce from "immer";
import { type InstanceProps, type Instance } from "@webstudio-is/react-sdk";

export const cloneProps = (
  instanceProps: InstanceProps,
  { instanceId }: { instanceId: Instance["id"] }
) =>
  produce((instanceProps: InstanceProps) => {
    instanceProps.id = ObjectId().toString();
    instanceProps.instanceId = instanceId;
    for (const prop of instanceProps.props) {
      prop.id = ObjectId().toString();
    }
  })(instanceProps);
