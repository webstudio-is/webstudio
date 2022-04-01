import {
  type UserPropsUpdates,
  useSubscribe,
  allUserPropsContainer,
  DeleteProp,
} from "@webstudio-is/sdk";
import { createTransaction, register } from "~/lib/sync-engine";
import {
  updateAllUserPropsMutable,
  deletePropMutable,
} from "~/shared/props-utils";

register("props", allUserPropsContainer);

export const useManageProps = () => {
  useSubscribe<"updateProps", UserPropsUpdates>(
    "updateProps",
    (userPropsUpdates) => {
      createTransaction([allUserPropsContainer], (allUserProps) => {
        updateAllUserPropsMutable(allUserProps, userPropsUpdates);
      });
    }
  );

  useSubscribe<"deleteProp", DeleteProp>("deleteProp", (deleteProp) => {
    createTransaction([allUserPropsContainer], (allUserProps) => {
      deletePropMutable(allUserProps, deleteProp);
    });
  });
};
