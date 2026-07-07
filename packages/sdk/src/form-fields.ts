/**
 * Used to identify form inside server handler
 */
export const formIdFieldName = `ws--form-id`;
/**
 * Used for simlpe protection against non js bots
 */
export const formBotFieldName = `ws--form-bot`;

/**
 * Detects if the browser is Brave.
 * Brave Shields blocks our bot protection mechanism (matchMedia fingerprinting detection),
 * causing form submissions to silently fail.
 * @see https://github.com/brave/brave-browser/issues/46541
 */
export const isBraveBrowser = (): boolean => {
  if (typeof navigator === "undefined") {
    return false;
  }
  // @ts-expect-error - brave is a non-standard property
  return navigator.brave?.isBrave?.() === true || navigator.brave !== undefined;
};
