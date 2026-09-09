import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";
import { userEvent } from "@vitest/browser/context";
import { TooltipProvider } from "@webstudio-is/design-system";
import { createAssetContentSession } from "@webstudio-is/content-engine/asset-content-session";
import type { Asset } from "@webstudio-is/sdk";
import { $assets } from "~/shared/sync/data-stores";
import { $authPermit } from "~/shared/nano-states";
import {
  createAssetContentBridge,
  __testing__,
} from "~/shared/asset-content-bridge.client";
import { TextFileEditor } from "./text-file-editor";
import { __testing__ as navigatorTesting } from "../navigator/navigator-tree";

const { initBridge, clearBridge } = __testing__;
const { MdxContentMenu } = navigatorTesting;
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

test.each(["repair", "discard", "navigator"])(
  "keeps invalid MDX drafts open until %s without replacing the saved article",
  async (action) => {
    const asset: Asset = {
      id: "validation-article",
      projectId: "validation-project",
      name: "article.mdx",
      format: "mdx",
      type: "file",
      size: 9,
      meta: {},
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const writes: string[] = [];
    const session = createAssetContentSession({
      repository: {
        readContent: async () => ({
          asset,
          data: (async function* () {
            yield new TextEncoder().encode("# Article");
          })(),
        }),
        updateContent: async ({ data }) => {
          writes.push(await new Response(data).text());
          return asset;
        },
      },
      authorize: () => true,
      debounceMilliseconds: 0,
    });
    initBridge(
      createAssetContentBridge({
        origin: window.location.origin,
        request: fetch,
        authorize: () => true,
        requireReload: vi.fn(),
        getContentSession: () => session,
      })
    );
    $assets.set(new Map([[asset.id, asset]]));
    const previousPermit = $authPermit.get();
    $authPermit.set("own");
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const onOpenChange = vi.fn();
    try {
      await act(async () =>
        root.render(
          <TooltipProvider>
            {action === "navigator" ? (
              <MdxContentMenu assetId={asset.id} />
            ) : (
              <TextFileEditor assetId={asset.id} onOpenChange={onOpenChange} />
            )}
          </TooltipProvider>
        )
      );
      if (action === "navigator") {
        await act(async () =>
          userEvent.click(
            document.querySelector('[aria-label="MDX content settings"]')!
          )
        );
        await act(async () =>
          userEvent.click(document.querySelector('[role="menuitem"]')!)
        );
      }
      await vi.waitFor(() =>
        expect(
          document.querySelector('[aria-label="Markdown source"]')
        ).not.toBeNull()
      );
      const editor = document.querySelector<HTMLElement>(
        '[aria-label="Markdown source"]'
      )!;
      await vi.waitFor(() => expect(document.activeElement).toBe(editor));
      if (action === "navigator") {
        return;
      }
      await act(async () => userEvent.fill(editor, "<YouTube url={ />"));
      const close = document.querySelector<HTMLButtonElement>(
        'button[aria-label="Close"]'
      )!;
      await act(async () => userEvent.click(close));
      await vi.waitFor(() =>
        expect(document.querySelector('[role="alert"]')).not.toBeNull()
      );
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(session.get(asset.id)?.source).toBe("# Article");
      expect(writes).toEqual([]);
      if (action === "repair") {
        await act(async () => userEvent.fill(editor, "# Repaired article"));
        await act(async () => userEvent.click(close));
      } else {
        const discard = Array.from(document.querySelectorAll("button")).find(
          (button) => button.textContent === "Discard changes"
        )!;
        await act(async () => userEvent.click(discard));
      }
      await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
      await act(async () => session.flush(asset.id));
      expect(session.get(asset.id)?.source).toBe(
        action === "repair" ? "# Repaired article" : "# Article"
      );
    } finally {
      await act(async () => root.unmount());
      container.remove();
      clearBridge();
      session.dispose();
      $authPermit.set(previousPermit);
      $assets.set(new Map());
    }
  }
);
