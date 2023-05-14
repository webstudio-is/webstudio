export type Params = {
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

let params: undefined | Params;

const emptyParams: Params = {
  imageBaseUrl: "/",
  assetBaseUrl: "/",
};

export const getParams = (): Params => params ?? emptyParams;

export const setParams = (newParams: undefined | Params) => {
  params = newParams;
};
