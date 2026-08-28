import {
  colorControllerNames,
  darkColorControllers,
  lightColorControllers,
} from "./color-controllers.generated";
import { compatibilityColor, semanticColor } from "./color-recipes.generated";

export const color = {
  ...lightColorControllers,
  ...semanticColor,
  ...compatibilityColor,
} as const;

export {
  colorControllerNames,
  darkColorControllers,
  lightColorControllers,
  semanticColor,
};
