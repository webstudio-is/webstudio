import { preventUnhandled } from "@atlaskit/pragmatic-drag-and-drop/prevent-unhandled";
import { setInert, resetInert } from "../canvas/shared/inert";
import { monitorForExternal } from "@atlaskit/pragmatic-drag-and-drop/external/adapter";
import { createRecursiveProxy } from "@trpc/server/shared";
import invariant from "tiny-invariant";
import { $canvasIframeState } from "./nano-states";

const apiWindowNamespace = "__webstudio__$__canvasApi";

const _canvasApi = {
  isInitialized: () => true,
  setInert,
  resetInert,
  preventUnhandled,
  monitorForExternal,
};

declare global {
  interface Window {
    [apiWindowNamespace]: typeof _canvasApi;
  }
}

const isInIframe = () => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
};

const getIframeApi = () => {
  if (isInIframe()) {
    // Inside the iframe, use the local window.api
    return _canvasApi;
  } else {
    // Find first iframe with the API
    for (let i = 0; i < window.frames.length; ++i) {
      const frame = window.frames[i];
      if (frame && frame[apiWindowNamespace]) {
        return frame[apiWindowNamespace];
      }
    }

    return;
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
export const canvasApi = createRecursiveProxy((options) => {
  const api = getIframeApi();

  if (api == null) {
    if (
      options.path.join(".") ===
      ("isInitialized" satisfies keyof typeof _canvasApi)
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
}) as typeof _canvasApi;

/**
 * Initializes the canvas API in the iframe. Must be called in the iframe context.
 */
export const initCanvasApi = () => {
  if (isInIframe()) {
    $canvasIframeState.set("ready");
    window[apiWindowNamespace] = _canvasApi;
  }
  return () => {
    // Does not work as expected, because the iframe is detached from the builder
    $canvasIframeState.set("idle");
  };
};
