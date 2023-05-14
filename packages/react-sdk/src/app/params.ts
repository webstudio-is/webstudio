export type Params = {
  /**
   * Base url ir base path for images with ending slash.
   * Used for configuring image with different sizes.
   * Concatinated with "name?width=&quality=&format=".
   *
   * For example
   * /asset/image/ used by default in builder
   * or
   * https://webstudio.is/asset/image/ can be specified
   * by user to use custom server
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
   * or
   * https://webstudio.is/asset/file/
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
