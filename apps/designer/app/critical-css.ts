import {
  insertCriticalCss as insert,
  getCssText as getCanvasCssText,
} from "@webstudio-is/react-sdk";
import { getCssText as getDesignerCssText } from "@webstudio-is/design-system";
import config from "./config";

const getCssTextFunctions = {
  [config.previewPath]: getCanvasCssText,
  [config.canvasPath]: getCanvasCssText,
  [config.designerPath]: getDesignerCssText,
  [config.dashboardPath]: getDesignerCssText,
  [config.loginPath]: getDesignerCssText,
};

const getCssTextFunction = (url: string) => {
  const { pathname } = new URL(url);
  let path: keyof typeof getCssTextFunctions;
  for (path in getCssTextFunctions) {
    if (pathname.indexOf(path) === 0) {
      return getCssTextFunctions[path];
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
  return insert(markup, getCssTextFunction(url));
};
