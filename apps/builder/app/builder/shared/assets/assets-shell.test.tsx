import { act } from "react-dom/test-utils";
import { afterEach, describe, expect, test } from "vitest";
import {
  ContextMenuContent,
  ContextMenuItem,
} from "@webstudio-is/design-system";
import { createAssetManagerTestRenderer } from "../asset-manager/test-utils";
import { AssetsShell } from "./assets-shell";

Object.defineProperty(globalThis, "DOMRect", {
  configurable: true,
  value: {
    fromRect: ({ x = 0, y = 0, width = 0, height = 0 }: DOMRectInit = {}) => ({
      x,
      y,
      width,
      height,
      top: y,
      right: x + width,
      bottom: y + height,
      left: x,
    }),
  },
});

const renderer = createAssetManagerTestRenderer();
afterEach(renderer.cleanup);

describe("AssetsShell", () => {
  test("opens its context menu from panel chrome outside the asset list", () => {
    const container = renderer.render(
      <AssetsShell
        searchProps={{}}
        isEmpty={false}
        type="file"
        contextMenu={
          <ContextMenuContent>
            <ContextMenuItem>Paste</ContextMenuItem>
          </ContextMenuContent>
        }
      >
        <div>Asset list</div>
      </AssetsShell>
    );

    const search = container.querySelector("input");
    act(() => {
      search?.dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
          clientX: 10,
          clientY: 10,
        })
      );
    });

    expect(document.body.textContent).toContain("Paste");
  });
});
