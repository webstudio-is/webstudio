import { StyleSheetRegular } from "./style-sheet-regular";
import { StyleElement, FakeStyleElement } from "./style-element";

export const createRegularStyleSheet = (options?: {
  name?: string;
  element?: StyleElement | FakeStyleElement;
}) => {
  const element = options?.element ?? new StyleElement(options?.name);
  return new StyleSheetRegular(element);
};
