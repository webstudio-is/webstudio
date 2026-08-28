import {
  colorControllerNames,
  darkColorControllers,
  lightColorControllers,
} from "./__generated__/color-controllers";
import {
  compatibilityColor,
  semanticColor,
} from "./__generated__/color-recipes";

const renamedSemanticColorCompatibility = {
  backgroundCanvas: semanticColor.backgroundPrimary,
  backgroundNeutralSubtle: semanticColor.backgroundSecondary,
  backgroundNeutral: semanticColor.backgroundMuted,
  backgroundNeutralHover: semanticColor.backgroundSecondaryHover,
  backgroundNeutralPressed: semanticColor.backgroundSecondaryPressed,
  backgroundNeutralDisabled: semanticColor.backgroundDisabled,
  backgroundNeutralStrong: semanticColor.backgroundStrong,
  contentPrimary: semanticColor.foregroundPrimary,
  contentSecondary: semanticColor.foregroundSecondary,
  contentMuted: semanticColor.foregroundMuted,
  contentDisabled: semanticColor.foregroundDisabled,
  contentInverse: semanticColor.foregroundInverse,
  contentInverseSecondary: semanticColor.foregroundInverseSecondary,
  contentAccent: semanticColor.foregroundAccent,
  contentPositive: semanticColor.foregroundPositive,
  contentNegative: semanticColor.foregroundNegative,
  contentWarning: semanticColor.foregroundWarning,
  contentInformative: semanticColor.foregroundInformative,
} as const;

/**
 * Existing component color API. Its values resolve into the Craft semantic
 * scales. New code should consume those scales directly.
 */
export const color = {
  ...semanticColor,
  ...renamedSemanticColorCompatibility,
  ...compatibilityColor,
} as const;

export {
  colorControllerNames,
  compatibilityColor,
  darkColorControllers,
  lightColorControllers,
  semanticColor,
};
