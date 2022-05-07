import store from "immerhin";
import { type StyleUpdates } from "~/shared/component";
import { findInstanceById, setInstanceStyleMutable } from "~/shared/tree-utils";
import { rootInstanceContainer, useSelectedInstance } from "./nano-values";
import { useSubscribe } from "./pubsub";

export const useUpdateStyle = () => {
  const [selectedInstance, setSelectedInstance] = useSelectedInstance();
  useSubscribe<"updateStyle", StyleUpdates>(
    "updateStyle",
    ({ id, updates, breakpoint }) => {
      // Only update styles if they match the selected instance
      // It can potentially happen that we selected a difference instance right after we changed the style in style panel.
      if (id !== selectedInstance?.id) return;

      store.createTransaction([rootInstanceContainer], (rootInstance) => {
        if (rootInstance === undefined) {
          return;
        }
        setInstanceStyleMutable(rootInstance, id, updates, breakpoint);
      });

      if (rootInstanceContainer.value === undefined) return;
      const instance = findInstanceById(rootInstanceContainer.value, id);
      if (instance === undefined) return;
      // We need to set new version of the selected instance after a style update,
      // so that anything that depends on instance.cssRules gets updated too.
      setSelectedInstance(instance);
    }
  );
};
