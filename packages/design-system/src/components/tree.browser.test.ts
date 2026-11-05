import { page } from "@vitest/browser/context";
import { createElement, memo } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, expect, test, vi } from "vitest";
import "../colors/colors.css";
import { TreeNode, TreeRoot } from "./tree";

let root: Root | undefined;

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("data-color-scheme");
});

test("keeps memoized rows out of unrelated tree updates", () => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  let renders = 0;
  const buttonProps = {
    get onClick() {
      renders += 1;
      return undefined;
    },
  };
  const Row = memo(({ selected }: { selected: boolean }) =>
    createElement(TreeNode, {
      level: 1,
      isSelected: selected,
      buttonProps,
      action: null,
      children: "Row",
    })
  );
  const render = (selected: boolean) =>
    act(() =>
      root?.render(
        createElement(TreeRoot, null, createElement(Row, { selected }))
      )
    );
  render(false);
  const initialRenders = renders;
  expect(initialRenders).toBeGreaterThan(0);
  render(false);
  expect(renders).toBe(initialRenders);
  const button =
    container.querySelector<HTMLButtonElement>("[data-tree-button]")!;
  act(() =>
    button.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowDown",
        ctrlKey: true,
        bubbles: true,
      })
    )
  );
  render(true);
  expect(button.getAttribute("aria-selected")).toBe("true");
  expect(document.activeElement).toBe(button);
});

test.each(
  [false, true].flatMap((memoized) =>
    ["ctrlKey", "metaKey"].map((modifier) => ({ memoized, modifier }))
  )
)(
  "$modifier reorder consumes focus restoration before a later selection (memoized: $memoized)",
  ({ modifier, memoized }) => {
    const container = document.createElement("div");
    const outside = document.createElement("input");
    document.body.append(container, outside);
    root = createRoot(container);
    const Row = ({ id, selected }: { id: string; selected: boolean }) =>
      createElement(TreeNode, {
        level: 1,
        isSelected: selected,
        buttonProps: {},
        action: null,
        children: id,
      });
    const Component = memoized ? memo(Row) : Row;
    const render = (order: string[], selected: string) =>
      act(() =>
        root?.render(
          createElement(
            TreeRoot,
            null,
            order.map((id) =>
              createElement(Component, {
                key: id,
                id,
                selected: id === selected,
              })
            )
          )
        )
      );
    render(["first", "second"], "first");
    const first =
      container.querySelector<HTMLButtonElement>("[data-tree-button]")!;
    act(() => {
      first.focus();
      first.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "ArrowDown",
          [modifier]: true,
          bubbles: true,
        })
      );
    });
    render(["second", "first"], "first");
    expect(document.activeElement).toBe(first);
    act(() => outside.focus());
    expect(document.activeElement).toBe(outside);
    render(["second", "first"], "second");
    expect(document.activeElement).toBe(outside);
  }
);

test.each(["ctrlKey", "metaKey"])(
  "%s reorder preserves the focused row within a multi-selection",
  (modifier) => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    const Row = memo(({ id }: { id: string }) =>
      createElement(TreeNode, {
        level: 1,
        isSelected: true,
        buttonProps: {},
        action: null,
        children: id,
      })
    );
    const render = (order: string[]) =>
      act(() =>
        root?.render(
          createElement(
            TreeRoot,
            null,
            order.map((id) => createElement(Row, { key: id, id }))
          )
        )
      );
    render(["first", "second", "third"]);
    const focused =
      container.querySelectorAll<HTMLButtonElement>("[data-tree-button]")[1];
    act(() => {
      focused.focus();
      focused.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "ArrowDown",
          [modifier]: true,
          bubbles: true,
        })
      );
    });
    render(["first", "third", "second"]);
    expect(document.activeElement).toBe(focused);
  }
);

test("restores focus when a moved row appears after its parent expands", () => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  const render = (visible: boolean) =>
    act(() =>
      root?.render(
        createElement(
          TreeRoot,
          null,
          visible
            ? createElement(TreeNode, {
                level: 1,
                isSelected: true,
                buttonProps: {},
                action: null,
                children: "Moved row",
              })
            : null
        )
      )
    );
  render(true);
  const first =
    container.querySelector<HTMLButtonElement>("[data-tree-button]")!;
  act(() => {
    first.focus();
    first.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowRight",
        ctrlKey: true,
        bubbles: true,
      })
    );
  });
  render(false);
  expect(document.activeElement).not.toBe(first);
  render(true);
  expect(document.activeElement).toBe(
    container.querySelector("[data-tree-button]")
  );
});

test.each(["ctrlKey", "metaKey"])(
  "%s without a move cannot restore focus after leaving the tree",
  (modifier) => {
    const container = document.createElement("div");
    const outside = document.createElement("input");
    document.body.append(container, outside);
    root = createRoot(container);
    const render = (selected: string) =>
      act(() =>
        root?.render(
          createElement(
            TreeRoot,
            null,
            ["first", "second"].map((id) =>
              createElement(TreeNode, {
                key: id,
                level: 1,
                isSelected: id === selected,
                buttonProps: {},
                action: null,
                children: id,
              })
            )
          )
        )
      );
    render("first");
    const first =
      container.querySelector<HTMLButtonElement>("[data-tree-button]")!;
    act(() => {
      first.focus();
      first.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "ArrowUp",
          [modifier]: true,
          bubbles: true,
        })
      );
    });
    // At the first row, move-up is a no-op and causes no tree commit.
    act(() => outside.focus());
    render("second");
    expect(document.activeElement).toBe(outside);
  }
);

test("replaces pending focus expiry on keydown and cancels it on unmount", () => {
  vi.useFakeTimers();
  try {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() =>
      root?.render(
        createElement(
          TreeRoot,
          null,
          createElement(TreeNode, {
            level: 1,
            isSelected: true,
            buttonProps: {},
            action: null,
            children: "Row",
          })
        )
      )
    );
    const baselineTimers = vi.getTimerCount();
    const button =
      container.querySelector<HTMLButtonElement>("[data-tree-button]")!;
    const keydown = () =>
      act(() =>
        button.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "ArrowUp",
            ctrlKey: true,
            bubbles: true,
          })
        )
      );
    keydown();
    expect(vi.getTimerCount()).toBe(baselineTimers + 1);
    keydown();
    expect(vi.getTimerCount()).toBe(baselineTimers + 1);
    act(() => root?.unmount());
    root = undefined;
    expect(vi.getTimerCount()).toBe(baselineTimers);
  } finally {
    act(() => root?.unmount());
    root = undefined;
    vi.useRealTimers();
  }
});

test("selected Navigator rows preserve selection and show hover feedback", async () => {
  const hoverEscape = document.createElement("div");
  hoverEscape.style.height = "20px";
  document.body.append(hoverEscape);
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  for (const mode of ["light", "dark"] as const) {
    document.documentElement.dataset.colorScheme = mode;

    for (const selection of ["selected", "selected-descendant"] as const) {
      await page.elementLocator(hoverEscape).hover();
      act(() => {
        root?.render(
          createElement(TreeNode, {
            level: 1,
            isSelected: selection === "selected",
            isSelectedDescendant: selection === "selected-descendant",
            buttonProps: {},
            action: null,
            children: selection,
          })
        );
      });

      const node = container.querySelector("[data-selection-state]");
      if (node === null) {
        throw new Error("Expected a rendered Tree node");
      }
      const selectedBackground = getComputedStyle(node).backgroundColor;

      await page.elementLocator(node).hover();

      const hoveredStyle = getComputedStyle(node);
      expect(hoveredStyle.backgroundColor, `${mode} ${selection}`).toBe(
        selectedBackground
      );
      expect(hoveredStyle.backgroundImage, `${mode} ${selection}`).not.toBe(
        "none"
      );
    }
  }
});

test("tree actions stay transparent over selected and hovered rows", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  act(() => {
    root?.render(
      createElement(TreeNode, {
        level: 1,
        isSelected: true,
        buttonProps: {},
        action: createElement("button", null, "Action"),
        children: "A long tree node label",
      })
    );
  });

  const node = container.querySelector("[data-selection-state]");
  const action = container.querySelector("[data-tree-action]");
  if (node === null || action === null) {
    throw new Error("Expected a rendered Tree node action");
  }

  await page.elementLocator(node).hover();

  expect(getComputedStyle(action).backgroundColor).toBe("rgba(0, 0, 0, 0)");
});
