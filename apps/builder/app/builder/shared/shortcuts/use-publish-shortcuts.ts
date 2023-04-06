import { useHotkeys } from "react-hotkeys-hook";
import { shortcuts, options, instanceTreeShortcuts } from "~/shared/shortcuts";
import type { Publish } from "~/shared/pubsub";
import { mergeRefs } from "@react-aria/utils";
import type { Ref } from "react";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    shortcut:
      | { name: keyof typeof shortcuts }
      | { name: keyof typeof instanceTreeShortcuts };
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
      (event) => {
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

/**
 * Forwarding shortcuts to the canvas.
 */
export const usePublishInstanceTreeShortcuts = <T extends HTMLElement>(
  publish: Publish
) => {
  const refs: Ref<T>[] = [];
  for (const [name, instaceTreeShortcut] of Object.entries(
    instanceTreeShortcuts
  )) {
    // as long as the array is static, it's ok
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const ref = useHotkeys(
      instaceTreeShortcut,
      (event) => {
        publish({
          type: "shortcut",
          payload: { name: name as keyof typeof instanceTreeShortcuts },
        });
      },
      options,
      []
    );
    refs.push(ref as Ref<T>);
  }

  return mergeRefs<T>(...refs);
};
