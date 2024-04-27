import { StyleSheetRegular } from "./style-sheet-regular";
import { StyleElement } from "./style-element";

export const createRegularStyleSheet = (options?: { name?: string }) => {
  const element = new StyleElement(options?.name);
  return new StyleSheetRegular(element);
};
