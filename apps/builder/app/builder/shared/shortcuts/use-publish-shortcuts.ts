import { useHotkeys } from "react-hotkeys-hook";
import { shortcuts, options } from "~/shared/shortcuts";
import type { Publish } from "~/shared/pubsub";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    shortcut: { name: keyof typeof shortcuts };
  }
}

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
        publish({
          type: "shortcut",
          payload: { name },
        });
      },
      options,
      []
    );
  });
};
