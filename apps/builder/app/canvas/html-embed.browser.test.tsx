import { useStore } from "@nanostores/react";
import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, test } from "vitest";
import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";
import { $resourcesState } from "~/shared/resources";
import { CanvasHtmlEmbed } from "./html-embed";

const targetTestId = "script-target";
let root: Root | undefined;

const ResourceContent = () => {
  const resourcesState = useStore($resourcesState);
  return (
    <div data-testid={targetTestId}>
      {resourcesState === "settled" ? "Resource content" : "Loading"}
    </div>
  );
};

const App = ({ renderer }: { renderer: "canvas" | "preview" }) => {
  const code = `
    <script>
      document.querySelector('[data-testid="${targetTestId}"]').dataset.scriptValue = document.querySelector('[data-testid="${targetTestId}"]').textContent;
    </script>
  `;
  return (
    <ReactSdkContext.Provider
      value={{
        assetBaseUrl: "",
        imageLoader: () => "",
        renderer,
        resources: {},
        breakpoints: [],
        onError: console.error,
      }}
    >
      <ResourceContent />
      <CanvasHtmlEmbed code={code} executeScriptOnCanvas={true} />
    </ReactSdkContext.Provider>
  );
};

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  $resourcesState.set("pending");
});

describe("CanvasHtmlEmbed", () => {
  test.each(["canvas", "preview"] as const)(
    "waits for resources in %s mode before executing scripts",
    async (renderer) => {
      const container = document.createElement("div");
      document.body.appendChild(container);
      root = createRoot(container);
      await act(async () => root?.render(<App renderer={renderer} />));

      const target = document.querySelector<HTMLElement>(
        `[data-testid="${targetTestId}"]`
      );

      expect(target?.dataset.scriptValue).toBe(undefined);

      await act(async () => $resourcesState.set("settled"));

      expect(target?.dataset.scriptValue).toBe("Resource content");
    }
  );
});
