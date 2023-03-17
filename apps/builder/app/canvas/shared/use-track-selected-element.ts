import { useEffect } from "react";
import { useStore } from "@nanostores/react";
import {
  selectedInstanceSelectorStore,
  textEditingInstanceIdStore,
} from "~/shared/nano-states";

export const useTrackSelectedElement = () => {
  const selectedInstanceSelector = useStore(selectedInstanceSelectorStore);
  const selectedInstanceId = selectedInstanceSelector?.[0];

  // @todo disable based on user input instead of tracking selected
  useEffect(() => {
    const editingInstanceId = textEditingInstanceIdStore.get();
    if (
      editingInstanceId !== undefined &&
      // @todo compare instance selectors
      selectedInstanceId !== editingInstanceId
    ) {
      textEditingInstanceIdStore.set(undefined);
    }
  }, [selectedInstanceId]);
};
