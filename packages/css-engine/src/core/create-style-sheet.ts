import { StyleSheetRegular } from "./style-sheet-regular";
import { StyleSheetAtomic } from "./style-sheet-atomic";
import { StyleElement } from "./style-element";

export const createRegularStyleSheet = (options?: { name?: string }) => {
  const element = new StyleElement(options?.name);
  return new StyleSheetRegular(element);
};

export const createAtomicStyleSheet = (options?: { name?: string }) => {
  const element = new StyleElement(options?.name);
  return new StyleSheetAtomic(element);
};
