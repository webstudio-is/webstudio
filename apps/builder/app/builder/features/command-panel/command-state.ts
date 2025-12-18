import { atom, computed } from "nanostores";
import type { ReactNode } from "react";

const $commandPanel = atom<
  | undefined
  | {
      lastFocusedElement: null | HTMLElement;
    }
>();

export const $isCommandPanelOpen = computed(
  $commandPanel,
  (commandPanel) => commandPanel !== undefined
);

export const openCommandPanel = () => {
  const activeElement =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  // store last focused element
  $commandPanel.set({
    lastFocusedElement: activeElement,
  });
};

export const closeCommandPanel = ({
  restoreFocus = false,
}: { restoreFocus?: boolean } = {}) => {
  const commandPanel = $commandPanel.get();
  $commandPanel.set(undefined);
  $commandContent.set(undefined);
  $commandSearch.set("");
  // restore focus in the next frame
  if (restoreFocus && commandPanel?.lastFocusedElement) {
    requestAnimationFrame(() => {
      commandPanel.lastFocusedElement?.focus();
    });
  }
};

export const $commandContent = atom<ReactNode>();

// Counter to force Command component remount when content changes
export const $commandContentKey = atom(0);

export const $commandSearch = atom("");

export const focusCommandPanel = () => {
  requestAnimationFrame(() => {
    const input = document.querySelector<HTMLInputElement>(
      "[cmdk-root] [cmdk-input]"
    );
    input?.focus();
  });
};
