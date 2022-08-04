import { useCallback } from "react";
import { useSelectedInstance } from "~/canvas/shared/nano-states";
import { getInstanceIdFromElement } from "~/shared/dom-utils";

/**
 * When instance is created or selected via setInstance, we need to focus it.
 */
export const useEnsureFocus = () => {
  const [selectedInstance] = useSelectedInstance();
  return useCallback(
    (element: HTMLElement | null) => {
      if (
        element !== null &&
        getInstanceIdFromElement(element) === selectedInstance?.id &&
        document.activeElement !== element
      ) {
        element.focus();
      }
    },
    [selectedInstance]
  );
};
