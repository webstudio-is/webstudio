import { transform as transformCss } from "esbuild";
import { transform as transformLightningCss } from "lightningcss";

export * from "./index.server";

export const canBuildCss = async (css: string): Promise<boolean> => {
  try {
    transformLightningCss({ filename: "index.css", code: Buffer.from(css) });
    await transformCss(css, { loader: "css", minify: true });
    return true;
  } catch {
    return false;
  }
};
