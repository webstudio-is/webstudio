import { createRecursiveProxy } from "@trpc/server/shared";
import invariant from "tiny-invariant";
import { toast } from "@webstudio-is/design-system";
import { uploadAssets } from "~/builder/shared/assets/use-assets";

const apiWindowNamespace = "__webstudio__$__builderApi";

const _builderApi = {
  isInitialized: () => true,
  toast,
  uploadImages: async (srcs: string[]) => {
    const urlToIds = await uploadAssets(
      "image",
      srcs.map((src) => new URL(src))
    );

    return new Map([...urlToIds.entries()].map(([url, id]) => [url.href, id]));
  },
};

declare global {
  interface Window {
    [apiWindowNamespace]: typeof _builderApi;
  }
}

const isInTop = () => {
  try {
    return window.self === window.top;
  } catch {
    return true;
  }
};

const getTopApi = () => {
  if (isInTop()) {
    // Inside the iframe, use the local window.api
    return _builderApi;
  } else {
    // Find first iframe with the API
    invariant(window.top);
    return window.top[apiWindowNamespace];
  }
};

const isKeyOf = <T>(key: unknown, obj: T): key is keyof T => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return key in obj;
};

/**
 * Forwards the call from the builder to the iframe, invoking the original API in the iframe.
 */
export const builderApi = createRecursiveProxy((options) => {
  const api = getTopApi();

  if (api == null) {
    if (
      options.path.join(".") ===
      ("isInitialized" satisfies keyof typeof _builderApi)
    ) {
      return false;
    }

    // eslint-disable-next-line no-console
    console.warn(
      `API not found in the iframe, skipping ${options.path.join(".")} call, iframe probably not loaded yet`
    );
    return null;
  }

  let currentMethod = api as unknown;

  for (const key of options.path) {
    invariant(
      isKeyOf(key, currentMethod),
      `API method ${options.path.join(".")} not found`
    );
    invariant(typeof currentMethod === "object");
    invariant(currentMethod != null);

    currentMethod = currentMethod[key];
  }

  invariant(
    typeof currentMethod === "function",
    `API method ${options.path.join(".")} is not a function`
  );

  return currentMethod.call(null, ...options.args);
}) as typeof _builderApi;

/**
 * Initializes the builder API in the window. Must be called in the builder context.
 */
export const initBuilderApi = () => {
  if (isInTop()) {
    window[apiWindowNamespace] = _builderApi;
  }
  return () => {};
};
