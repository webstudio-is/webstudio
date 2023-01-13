import { allUserPropsContainer } from "@webstudio-is/react-sdk";
import { useSubscribe } from "~/shared/pubsub";
import store from "immerhin";
import {
  updateAllUserPropsMutable,
  deletePropMutable,
} from "~/shared/props-utils";

export const useManageProps = () => {
  useSubscribe("updateProps", (userPropsUpdates) => {
    store.createTransaction([allUserPropsContainer], (allUserProps) => {
      updateAllUserPropsMutable(allUserProps, userPropsUpdates);
    });
  });

  useSubscribe("deleteProp", (deleteProp) => {
    store.createTransaction([allUserPropsContainer], (allUserProps) => {
      deletePropMutable(allUserProps, deleteProp);
    });
  });
};
