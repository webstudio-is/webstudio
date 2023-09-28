import { UnoGenerator, createGenerator } from "@unocss/core";
import presetMini, { type Theme } from "@unocss/preset-uno";
import { expandTailwindShorthand } from "./shorthand";
import { substituteVariables } from "./substitute";
import warnOnce from "warn-once";

let unoLazy: UnoGenerator<Theme> | undefined = undefined;

const uno = () => {
  unoLazy = createGenerator({
    presets: [presetMini()],
  });
  return unoLazy;
};

/**
 * Parses Tailwind classes to CSS by expanding shorthands and substituting variables.
 */
export const parseTailwindToCss = async (classes: string, warn = warnOnce) => {
  const expandedClasses = expandTailwindShorthand(classes);
  const generated = await uno().generate(expandedClasses, { preflights: true });

  const cssWithClasses = substituteVariables(generated.css, warn);
  return cssWithClasses;
};
