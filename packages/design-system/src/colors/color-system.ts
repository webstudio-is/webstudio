import {
  colorControllerNames,
  darkColorControllers,
  lightColorControllers,
} from "./__generated__/color-controllers";
import {
  compatibilityColor,
  semanticColor,
} from "./__generated__/color-recipes";

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
