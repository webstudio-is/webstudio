import type { ReactNode } from "react";
import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";

export const createBrowserTestRenderer = () => {
  const global = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
  const previousActEnvironment = global.IS_REACT_ACT_ENVIRONMENT;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  return {
    render: async (element: ReactNode) => act(async () => root.render(element)),
    unmount: () => {
      act(() => root.unmount());
      container.remove();
      global.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
    },
  };
};
