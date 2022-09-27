import {
  insertCriticalCss as insert,
  getCssText as getCanvasCssText,
  resetCss as resetCanvasCss,
} from "@webstudio-is/react-sdk";
import {
  getCssText as getDesignerCssText,
  reset as resetDesignerCss,
} from "@webstudio-is/design-system";
import config from "./config";

const flushCanvas = () => {
  const css = getCanvasCssText();
  resetCanvasCss();
  return css;
};

const flushDesigner = () => {
  const css = getDesignerCssText();
  resetDesignerCss();
  return css;
};

const flushFunctions = {
  [config.previewPath]: flushCanvas,
  [config.canvasPath]: flushCanvas,
  [config.designerPath]: flushDesigner,
  [config.dashboardPath]: flushDesigner,
  [config.loginPath]: flushDesigner,
};

const getFlushFunction = (url: string) => {
  const { pathname } = new URL(url);
  let path: keyof typeof flushFunctions;
  for (path in flushFunctions) {
    if (pathname.indexOf(path) === 0) {
      return flushFunctions[path];
    }
  }
  return getCanvasCssText;
};

/**
 * This works around the problem with getCssTextfunction being a different one
 * depending on createStitches() used in each outlet.
 * @todo find a better way
 */
export const insertCriticalCss = (markup: string, url: string): string => {
  return insert(markup, getFlushFunction(url));
};
