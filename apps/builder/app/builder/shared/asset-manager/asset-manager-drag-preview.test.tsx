import { expect, test, vi } from "vitest";
import { renderAssetManagerDragPreview } from "./asset-manager-drag-preview";

test("renders selected thumbnails as a stacked drag preview", () => {
  const first = document.createElement("button");
  const second = document.createElement("button");
  first.setAttribute("data-asset-manager-drag-key", "asset:1");
  second.setAttribute("data-asset-manager-drag-key", "folder:2");
  first.getBoundingClientRect = vi.fn(() => ({
    width: 80,
    height: 60,
  })) as never;
  document.body.appendChild(first);
  document.body.appendChild(second);
  const container = document.createElement("div");

  expect(
    renderAssetManagerDragPreview({
      container,
      items: [
        { type: "asset", id: "1" },
        { type: "folder", id: "2" },
      ],
    })
  ).toBe(true);
  expect(container.children).toHaveLength(2);
  expect(container.style.width).toBe("86px");
  expect(container.style.height).toBe("66px");
  expect((container.lastElementChild as HTMLElement).style.top).toBe("0px");

  first.remove();
  second.remove();
});

test("keeps the native preview for a single item", () => {
  const container = document.createElement("div");
  expect(
    renderAssetManagerDragPreview({
      container,
      items: [{ type: "asset", id: "missing" }],
    })
  ).toBe(false);
  expect(container.children).toHaveLength(0);
});
