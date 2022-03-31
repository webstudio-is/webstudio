import { useHotkeys } from "react-hotkeys-hook";
import { type Publish } from "~/designer/features/canvas-iframe";
import { shortcuts } from "~/shared/shortcuts";

const names = Object.keys(shortcuts) as Array<keyof typeof shortcuts>;

/**
 * Forwarding shortcuts to the canvas.
 */
export const usePublishShortcuts = (publish: Publish) => {
  names.forEach((name) => {
    // as long as the array is static, it's ok
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useHotkeys(
      shortcuts[name],
      () => {
        publish<"shortcut", string>({
          type: "shortcut",
          payload: name,
        });
      },
      []
    );
  });
};
