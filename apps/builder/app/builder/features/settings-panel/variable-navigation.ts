import { atom } from "nanostores";

export const $variableToFocus = atom<string | undefined>();

export const showVariable = (id: string) => {
  // Focus the existing variable in the current scope without changing the
  // selected canvas instance or navigating to where the variable was defined.
  $variableToFocus.set(id);
};
