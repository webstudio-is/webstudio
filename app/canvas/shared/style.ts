import { createTransaction } from "immerhin";
import { type StyleUpdates } from "~/shared/component";
import { setInstanceStyleMutable } from "~/shared/tree-utils";
import { rootInstanceContainer, useSelectedInstance } from "./nano-values";
import { useSubscribe } from "./pubsub";

export const useUpdateStyle = () => {
  const [selectedInstance] = useSelectedInstance();

  useSubscribe<"updateStyle", StyleUpdates>(
    "updateStyle",
    ({ id, updates }) => {
      createTransaction([rootInstanceContainer], (rootInstance) => {
        if (rootInstance === undefined || id !== selectedInstance?.id) {
          return;
        }
        setInstanceStyleMutable(rootInstance, id, updates);
      });
    }
  );
};
