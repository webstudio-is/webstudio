import { createContext } from "react";
import type { Page } from "@webstudio-is/sdk";
import type { ImageLoader } from "@webstudio-is/image";

export type Params = {
  renderer?: "canvas" | "preview";
  /**
   * Base url ir base path for images with ending slash.
   * Used for configuring image with different sizes.
   * Concatinated with "name?width=&quality=&format=".
   *
   * For example
   * /asset/image/ used by default in builder
   * https://image-transform.wstd.io/cdn-cgi/image/
   * https://webstudio.is/cdn-cgi/image/
   */
  imageBaseUrl: string;
  /**
   * Base url or base path for any asset with ending slash.
   * Used to load assets like fonts or images in styles
   * Concatinated with "name".
   *
   * For example
   * /s/uploads/
   * /asset/file/
   * https://assets-dev.webstudio.is/
   * https://assets.webstudio.is/
   */
  assetBaseUrl: string;
};

export const ReactSdkContext = createContext<
  Params & {
    imageLoader: ImageLoader;
    /**
     * List of pages paths for link component
     * to navigate without reloading on published sites
     * always empty for builder which handle anchor clicks globally
     */
    pagesPaths: Set<Page["path"]>;
  }
>({
  assetBaseUrl: "/",
  imageBaseUrl: "/",
  imageLoader: ({ src }) => src,
  pagesPaths: new Set(),
});
