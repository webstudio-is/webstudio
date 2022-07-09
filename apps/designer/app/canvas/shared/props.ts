import {
  type UserPropsUpdates,
  useSubscribe,
  allUserPropsContainer,
  DeleteProp,
} from "@webstudio-is/sdk";
import store from "immerhin";
import {
  updateAllUserPropsMutable,
  deletePropMutable,
} from "~/shared/props-utils";

export const useManageProps = () => {
  useSubscribe<"updateProps", UserPropsUpdates>(
    "updateProps",
    (userPropsUpdates) => {
      store.createTransaction([allUserPropsContainer], (allUserProps) => {
        updateAllUserPropsMutable(allUserProps, userPropsUpdates);
      });
    }
  );

  useSubscribe<"deleteProp", DeleteProp>("deleteProp", (deleteProp) => {
    store.createTransaction([allUserPropsContainer], (allUserProps) => {
      deletePropMutable(allUserProps, deleteProp);
    });
  });
};
