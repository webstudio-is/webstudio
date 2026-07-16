import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

export const createAssetManagerTestRenderer = () => {
  let root: Root | undefined;

  return {
    render(element: ReactNode) {
      const container = document.createElement("div");
      document.body.appendChild(container);
      root = createRoot(container);
      act(() => root?.render(element));
      return container;
    },
    cleanup() {
      act(() => root?.unmount());
      root = undefined;
      document.body.innerHTML = "";
    },
  };
};
