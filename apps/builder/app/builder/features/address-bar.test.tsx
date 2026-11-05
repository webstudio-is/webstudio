import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import { userEvent } from "@vitest/browser/context";
import { expect, test } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import { $pages } from "~/shared/sync/data-stores";
import { $selectedPageId } from "~/shared/nano-states";
import { $currentSystem, $systemDataByPage } from "~/shared/system";
import { registerContainers } from "~/shared/sync/sync-stores";
import { AddressBarPopover } from "./address-bar";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
registerContainers();

test.each(["hover", "keyboard"])(
  "typing a new address clears a %s history suggestion",
  async (selection) => {
    const previousPages = $pages.get();
    const previousPageId = $selectedPageId.get();
    const previousSystem = $systemDataByPage.get();
    $systemDataByPage.set(new Map());
    $pages.set({
      homePageId: "home",
      rootFolderId: "root",
      folders: new Map([
        [
          "root",
          { id: "root", name: "", slug: "", children: ["home", "dynamic"] },
        ],
      ]),
      pages: new Map([
        [
          "home",
          {
            id: "home",
            name: "Home",
            path: "",
            title: "",
            meta: {},
            rootInstanceId: "home-root",
          },
        ],
        [
          "dynamic",
          {
            id: "dynamic",
            name: "Dynamic",
            path: "/blog/:slug",
            title: "",
            meta: {},
            rootInstanceId: "dynamic-root",
            history: ["/blog/previous", "/blog/older"],
          },
        ],
      ]),
    });
    $selectedPageId.set("dynamic");
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    try {
      await act(async () =>
        root.render(
          <TooltipProvider>
            <AddressBarPopover />
          </TooltipProvider>
        )
      );
      await act(async () =>
        userEvent.click(container.querySelector("button")!)
      );
      const input =
        document.querySelector<HTMLInputElement>('input[name="slug"]')!;
      await act(async () => userEvent.click(input));
      if (selection === "hover") {
        const olderOption = Array.from(
          document.querySelectorAll<HTMLElement>('[role="option"]')
        ).find((option) => option.textContent === "/blog/older")!;
        await act(async () => userEvent.hover(olderOption));
      } else {
        await act(async () => userEvent.keyboard("{ArrowDown}"));
      }
      expect(
        document.querySelector('[role="option"][aria-selected="true"]')
      ).not.toBeNull();
      await act(async () => userEvent.fill(input, "new-address"));
      await act(async () => userEvent.keyboard("{Enter}"));
      expect($currentSystem.get().params.slug).toBe("new-address");
      await act(async () =>
        userEvent.click(container.querySelector("button")!)
      );
      expect(
        document.querySelector<HTMLInputElement>('input[name="slug"]')?.value
      ).toBe("new-address");
    } finally {
      act(() => root.unmount());
      container.remove();
      $pages.set(previousPages);
      $selectedPageId.set(previousPageId);
      $systemDataByPage.set(previousSystem);
    }
  }
);
