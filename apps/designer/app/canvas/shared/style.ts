import store from "immerhin";
import { useSubscribe } from "~/shared/pubsub";
import { setInstanceStyleMutable } from "~/shared/tree-utils";
import { useSelectedInstance } from "./nano-states";
import { rootInstanceContainer } from "~/shared/nano-states";
import { toValue, toVarNamespace } from "@webstudio-is/react-sdk";

export const useUpdateStyle = () => {
  const [selectedInstance] = useSelectedInstance();
  useSubscribe("updateStyle", ({ id, updates, breakpoint }) => {
    // Only update styles if they match the selected instance
    // It can potentially happen that we selected a difference instance right after we changed the style in style panel.
    if (id !== selectedInstance?.id) return;

    store.createTransaction([rootInstanceContainer], (rootInstance) => {
      if (rootInstance === undefined) {
        return;
      }
      setInstanceStyleMutable(rootInstance, id, updates, breakpoint);
    });
  });
};

export const usePreviewStyle = () => {
  useSubscribe("previewStyle", ({ id, updates }) => {
    for (const update of updates) {
      const property = `--${toVarNamespace(id, update.property)}`;
      if (update.value === undefined) {
        document.body.style.removeProperty(property);
        continue;
      }
      document.body.style.setProperty(property, toValue(update.value));
    }
  });
};
