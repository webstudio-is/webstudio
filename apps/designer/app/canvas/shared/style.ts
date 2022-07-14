import store from "immerhin";
import { useSubscribe } from "@webstudio-is/react-sdk";
import { type StyleUpdates } from "~/shared/canvas-components";
import { setInstanceStyleMutable } from "~/shared/tree-utils";
import { useSelectedInstance } from "./nano-states";
import { rootInstanceContainer } from "~/shared/nano-states";

export const useUpdateStyle = () => {
  const [selectedInstance] = useSelectedInstance();
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
    }
  );
};
