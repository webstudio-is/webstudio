import { useStore } from "@nanostores/react";
import { shallowEqual } from "shallow-equal";
import { atom, computed } from "nanostores";

export type Modifiers = {
  altKey: boolean;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
};

// Used for combined mouse and keyboard interactions, like scrubbing while holding ALT.
// If it's just a keyboard interaction, you should already have a keyboard event at hand.
const defaultModifiers: Modifiers = {
  shiftKey: false,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
};
const $modifierKeys = atom(defaultModifiers);
export const $isAltPressed = computed($modifierKeys, (keys) => keys.altKey);

if (typeof window !== "undefined") {
  const update = (event: KeyboardEvent | MouseEvent) => {
    const keys = {
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
    };
    if (!shallowEqual($modifierKeys.get(), keys)) {
      $modifierKeys.set(keys);
    }
  };
  // Mouse movement also restores modifier state after a lost keyup event.
  window.addEventListener("keydown", update);
  window.addEventListener("keyup", update);
  window.addEventListener("mousemove", update);
  window.addEventListener("blur", () => $modifierKeys.set(defaultModifiers));
}

export const useModifierKeys = () => useStore($modifierKeys);
