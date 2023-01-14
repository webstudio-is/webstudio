import { type AllUserProps, type DeleteProp } from "@webstudio-is/react-sdk";

export const deletePropMutable = (
  allProps: AllUserProps,
  deleteProp: DeleteProp
) => {
  const props = allProps[deleteProp.instanceId];
  if (props === undefined) {
    return false;
  }
  const index = props.findIndex(({ id }) => id === deleteProp.propId);
  if (index === -1) {
    return false;
  }
  props.splice(index, 1);
  return true;
};
