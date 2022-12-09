import { type AllUserProps, type DeleteProp } from "@webstudio-is/react-sdk";

export const deletePropMutable = (
  allProps: AllUserProps,
  deleteProp: DeleteProp
) => {
  const prop = allProps[deleteProp.instanceId];
  if (prop === undefined) {
    return false;
  }
  const index = prop.props.findIndex(({ id }) => id === deleteProp.propId);
  if (index === -1) {
    return false;
  }
  prop.props.splice(index, 1);
  return true;
};
