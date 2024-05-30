import { setInert, resetInert } from "../canvas/shared/inert";

const apiWindowNamespace = "__webstudio__$__canvasApi";

const _canvasApi = {
  setInert,
  resetInert,
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

    throw new Error("Iframe or API not found");
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
export const canvasApi = new Proxy(_canvasApi, {
  get(_target, prop) {
    if (typeof prop === "symbol") {
      throw new Error("Symbol properties are not supported");
    }

    const api = getIframeApi();

    if (api && isKeyOf(prop, api)) {
      return api[prop].bind(api);
    } else {
      throw new Error(`API method ${prop} not found`);
    }
  },
});

/**
 * Initializes the canvas API in the iframe. Must be called in the iframe context.
 */
export const initCanvasApi = () => {
  if (isInIframe()) {
    window[apiWindowNamespace] = _canvasApi;
  }
};
