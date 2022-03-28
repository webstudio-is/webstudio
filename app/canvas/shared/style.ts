import { type StyleUpdates } from "~/shared/component";
import { setInstanceStyle } from "~/shared/tree-utils";
import { useRootInstance, useSelectedInstance } from "./nano-values";
import { useSubscribe } from "./pubsub";

export const useUpdateInstanceStyle = () => {
  const [rootInstance, setRootInstance] = useRootInstance();
  const [selectedInstance] = useSelectedInstance();

  useSubscribe<"updateStyles", StyleUpdates>("updateStyles", (styleUpdates) => {
    if (
      rootInstance === undefined ||
      styleUpdates.id !== selectedInstance?.id
    ) {
      return;
    }
    const updatedRoot = setInstanceStyle(
      rootInstance,
      styleUpdates.id,
      styleUpdates.updates
    );
    setRootInstance(updatedRoot);
  });
};
