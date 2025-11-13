import { createContext, useContext, useMemo } from "react";
import type { ImageLoader, VideoLoader } from "@webstudio-is/image";
import {
  createJsonStringifyProxy,
  isPlainObject,
} from "@webstudio-is/sdk/runtime";

export type Params = {
  /**
   * When rendering a published version, there is no renderer defined.
   * - canvas is the builder canvas in dev mode
   * - preview is the preview mode in builder
   */
  renderer?: "canvas" | "preview";
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
    videoLoader?: VideoLoader;
    // resources need to be any to support accessing unknown fields without extra checks
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resources: Record<string, any>;
    breakpoints: { id: string; minWidth?: number; maxWidth?: number }[];
    onError: (error: unknown) => void;
  }
>({
  assetBaseUrl: "/",
  imageLoader: ({ src }) => src,
  videoLoader: ({ src }) => src,
  resources: {},
  breakpoints: [],
  onError: (error) => {
    console.error(error);
  },
});

export const useResource = (name: string) => {
  const { resources } = useContext(ReactSdkContext);
  const resource = resources[name];

  const resourceMemozied = useMemo(
    () =>
      isPlainObject(resource) ? createJsonStringifyProxy(resource) : resource,
    [resource]
  );

  return resourceMemozied;
};
