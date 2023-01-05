import { CssEngine, type CssEngineOptions } from "./css-engine";

export const createCssEngine = (options: CssEngineOptions = {}) => {
  return new CssEngine(options);
};
