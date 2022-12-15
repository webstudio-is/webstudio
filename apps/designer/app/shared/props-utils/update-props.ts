import { v4 as uuid } from "uuid";
import {
  type AllUserProps,
  type UserPropsUpdates,
} from "@webstudio-is/react-sdk";

export const updateAllUserPropsMutable = (
  treeId: string,
  allUserProps: AllUserProps,
  { instanceId, propsId, updates }: UserPropsUpdates
) => {
  if (instanceId in allUserProps === false) {
    allUserProps[instanceId] = {
      id: propsId ?? uuid(),
      instanceId,
      treeId,
      props: [],
    };
  }
  const instanceProps = allUserProps[instanceId];
  for (const update of updates) {
    const propIndex = instanceProps.props.findIndex(
      ({ id }) => id === update.id
    );

    if (propIndex === -1) {
      instanceProps.props.push(update);
    } else {
      const prop = instanceProps.props[propIndex];

      prop.prop = update.prop;
      prop.type = update.type;
      prop.value = update.value;
      prop.required = update.required;
    }
  }
};
