import {
  insertCriticalCss as insert,
  flushCss as flushCanvasCss,
} from "@webstudio-is/react-sdk";
import { flushCss as flushDesignerCss } from "@webstudio-is/design-system";
import config from "./config";

const flushFunctions = {
  [config.previewPath]: flushCanvasCss,
  [config.canvasPath]: flushCanvasCss,
  [config.designerPath]: flushDesignerCss,
  [config.dashboardPath]: flushDesignerCss,
  [config.loginPath]: flushDesignerCss,
};

const getFlushFunction = (url: string) => {
  const { pathname } = new URL(url);
  let path: keyof typeof flushFunctions;
  for (path in flushFunctions) {
    if (pathname.indexOf(path) === 0) {
      return flushFunctions[path];
    }
  }
  return flushCanvasCss;
};

/**
 * This works around the problem with getCssTextfunction being a different one
 * depending on createStitches() used in each outlet.
 * @todo find a better way
 */
export const insertCriticalCss = (markup: string, url: string): string => {
  return insert(markup, getFlushFunction(url));
};
