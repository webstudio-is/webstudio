import store from "immerhin";
import { useSubscribe } from "~/shared/pubsub";
import { setInstanceStyleMutable } from "~/shared/tree-utils";
import { useSelectedInstance } from "./nano-states";
import { rootInstanceContainer } from "~/shared/nano-states";
import {
  type StyleValue,
  toValue,
  toVarNamespace,
} from "@webstudio-is/react-sdk";

const setCssVar = (id: string, property: string, value?: StyleValue) => {
  const customProperty = `--${toVarNamespace(id, property)}`;
  if (value === undefined) {
    document.body.style.removeProperty(customProperty);
    return;
  }
  document.body.style.setProperty(customProperty, toValue(value));
};

export const useUpdateStyle = () => {
  const [selectedInstance] = useSelectedInstance();
  useSubscribe("updateStyle", ({ id, updates, breakpoint }) => {
    // Only update styles if they match the selected instance
    // It can potentially happen that we selected a difference instance right after we changed the style in style panel.
    if (id !== selectedInstance?.id) return;

    for (const update of updates) {
      setCssVar(id, update.property, undefined);
    }

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
      setCssVar(id, update.property, update.value);
    }
  });
};
