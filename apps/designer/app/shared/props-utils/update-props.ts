import {
  type AllUserProps,
  type UserPropsUpdates,
} from "@webstudio-is/react-sdk";

export const updateAllUserPropsMutable = (
  allUserProps: AllUserProps,
  { instanceId, updates }: UserPropsUpdates
) => {
  if (allUserProps[instanceId] === undefined) {
    allUserProps[instanceId] = [];
  }
  const instanceProps = allUserProps[instanceId];
  for (const update of updates) {
    const propIndex = instanceProps.findIndex(({ id }) => id === update.id);

    if (propIndex === -1) {
      instanceProps.push(update);
    } else {
      const prop = instanceProps[propIndex];

      prop.prop = update.prop;
      prop.type = update.type;
      prop.value = update.value;
      prop.required = update.required;
    }
  }
};
