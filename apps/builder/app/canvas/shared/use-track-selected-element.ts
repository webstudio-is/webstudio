import { useEffect } from "react";
import { useStore } from "@nanostores/react";
import {
  selectedInstanceAddressStore,
  textEditingInstanceIdStore,
} from "~/shared/nano-states";

export const useTrackSelectedElement = () => {
  const selectedInstanceAddress = useStore(selectedInstanceAddressStore);
  const selectedInstanceId = selectedInstanceAddress?.[0];

  // @todo disable based on user input instead of tracking selected
  useEffect(() => {
    const editingInstanceId = textEditingInstanceIdStore.get();
    if (
      editingInstanceId !== undefined &&
      // @todo compare instance addresses
      selectedInstanceId !== editingInstanceId
    ) {
      textEditingInstanceIdStore.set(undefined);
    }
  }, [selectedInstanceId]);
};
