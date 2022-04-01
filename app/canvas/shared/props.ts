import {
  type UserPropsUpdates,
  useSubscribe,
  allUserPropsContainer,
} from "@webstudio-is/sdk";
import { createTransaction, register } from "~/lib/sync-engine";
import { updateAllUserPropsMutable } from "~/shared/props-utils";

register("props", allUserPropsContainer);

export const useUpdateProps = () => {
  useSubscribe<"updateProps", UserPropsUpdates>(
    "updateProps",
    (userPropsUpdates) => {
      createTransaction([allUserPropsContainer], (allUserProps) => {
        updateAllUserPropsMutable(allUserProps, userPropsUpdates);
      });
    }
  );
};
