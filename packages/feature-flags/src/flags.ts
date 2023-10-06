export const example = false;
export const dark = false;
export const unsupportedBrowsers = false;
export const displayContents = false;
// @todo this should be pro users check
export const adminRole = false;
// A general flag to enable/disable all the AI features.
export const ai = process.env.NODE_ENV !== "production";
export const aiCopy = ai;
export const aiOperations = ai;
