import { allUserPropsContainer } from "@webstudio-is/react-sdk";
import { useSubscribe } from "~/shared/pubsub";
import store from "immerhin";
import {
  updateAllUserPropsMutable,
  deletePropMutable,
} from "~/shared/props-utils";

export const useManageProps = ({ treeId }: { treeId: string }) => {
  useSubscribe("updateProps", (userPropsUpdates) => {
    store.createTransaction([allUserPropsContainer], (allUserProps) => {
      updateAllUserPropsMutable(treeId, allUserProps, userPropsUpdates);
    });
  });

  useSubscribe("deleteProp", (deleteProp) => {
    store.createTransaction([allUserPropsContainer], (allUserProps) => {
      deletePropMutable(allUserProps, deleteProp);
    });
  });
};
