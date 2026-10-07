import { atom } from "nanostores";

export const $highlightedVariable = atom<{ id: string } | undefined>();

export const showVariable = (id: string) => {
  // Highlight the existing variable in the current scope without changing the
  // selected canvas instance or navigating to where the variable was defined.
  $highlightedVariable.set({ id });
};
