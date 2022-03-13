import { type StyleUpdates } from "~/shared/component";
import { type Instance } from "@webstudio-is/sdk";
import { setInstanceStyle } from "~/shared/tree-utils";
import { useSelectedInstance } from "../nano-values";
import { useSubscribe } from "../pubsub";

export const useUpdateInstanceStyle = ({
  rootInstance,
  setRootInstance,
}: {
  rootInstance: Instance;
  setRootInstance: (instance: Instance) => void;
}) => {
  const [selectedInstance] = useSelectedInstance();

  useSubscribe<"updateStyles", StyleUpdates>("updateStyles", (styleUpdates) => {
    if (styleUpdates.id !== selectedInstance?.id) return;
    const updatedRoot = setInstanceStyle(
      rootInstance,
      styleUpdates.id,
      styleUpdates.updates
    );
    setRootInstance(updatedRoot);
  });
};
