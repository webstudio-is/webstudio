import { type ReadableAtom, atom } from "nanostores";
import { createContext } from "react";
import type { Assets } from "@webstudio-is/sdk";
import type { Pages, PropsByInstanceId } from "./props";
import type { IndexesWithinAncestors } from "./instance-utils";
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
    propsByInstanceIdStore: ReadableAtom<PropsByInstanceId>;
    assetsStore: ReadableAtom<Assets>;
    pagesStore: ReadableAtom<Pages>;
    dataSourcesLogicStore: ReadableAtom<Map<string, unknown>>;
    indexesWithinAncestors: IndexesWithinAncestors;
  }
>({
  assetBaseUrl: "/",
  imageBaseUrl: "/",
  imageLoader: ({ src }) => src,
  propsByInstanceIdStore: atom(new Map()),
  assetsStore: atom(new Map()),
  pagesStore: atom(new Map()),
  dataSourcesLogicStore: atom(new Map()),
  indexesWithinAncestors: new Map(),
});
