import { useEffect, useRef } from "react";

/**
 * Auto-selects the first item in a command list when search changes.
 * Returns a ref that should be attached to the CommandList element.
 *
 * Note: This implementation uses keyboard event simulation as a workaround because cmdk
 * doesn't expose an imperative API for programmatically highlighting items.
 * The library is designed to work through keyboard/mouse interactions only.
 */
export const useAutoSelectFirstItem = (search: string) => {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!listRef.current) {
      return;
    }

    requestAnimationFrame(() => {
      const root = listRef.current?.closest("[cmdk-root]") as HTMLElement;
      if (!root) {
        return;
      }

      // Workaround: Simulate keyboard navigation to select the first item
      // First press End to go to the last item (ensures we're in a known position)
      const endEvent = new KeyboardEvent("keydown", {
        key: "End",
        bubbles: true,
      });
      root.dispatchEvent(endEvent);

      // Then press Home to go to the first item
      const homeEvent = new KeyboardEvent("keydown", {
        key: "Home",
        bubbles: true,
      });
      root.dispatchEvent(homeEvent);
    });
  }, [search]);

  return listRef;
};
