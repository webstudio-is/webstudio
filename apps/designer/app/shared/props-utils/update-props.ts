import {
  type AllUserProps,
  type UserPropsUpdates,
} from "@webstudio-is/react-sdk";

export const updateAllUserPropsMutable = (
  allUserProps: AllUserProps,
  { instanceId, propsId, treeId, updates }: UserPropsUpdates
) => {
  if (instanceId in allUserProps === false) {
    allUserProps[instanceId] = {
      id: propsId,
      instanceId,
      treeId,
      props: [],
    };
  }
  const instanceProps = allUserProps[instanceId];
  for (const update of updates) {
    const prop = instanceProps.props.find(({ id }) => id === update.id);
    if (prop === undefined) {
      instanceProps.props.push(update);
    } else {
      prop.prop = update.prop;
      prop.value = update.value;
    }
  }
};
