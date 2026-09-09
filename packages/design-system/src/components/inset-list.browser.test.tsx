import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, expect, test, vi } from "vitest";
import { userEvent } from "@vitest/browser/context";
import { InsetList, InsetListItem } from "./inset-list";
import { List, ListItem } from "./primitives/list";

let root: Root | undefined;

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
});

const pressArrow = (element: HTMLElement, key: string) => {
  act(() => {
    element.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });
};

test("keeps navigation labels left aligned beside their icons", () => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() =>
    root?.render(
      <InsetList css={{ width: 220 }}>
        <InsetListItem asChild>
          <a href="#projects">
            <svg width="16" height="16" />
            <span>Projects</span>
          </a>
        </InsetListItem>
        <InsetListItem>Settings</InsetListItem>
      </InsetList>
    )
  );
  const link = container.querySelector("a")!;
  const icon = link.querySelector("svg")!.getBoundingClientRect();
  const label = link.querySelector("span")!.getBoundingClientRect();
  expect(label.left - icon.right).toBeLessThanOrEqual(8);
  expect(getComputedStyle(container.querySelector("button")!).textAlign).toBe(
    "left"
  );
});

test.each(["{Enter}", " "])("activates list items with %s", async (key) => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  const onSelect = vi.fn();
  act(() =>
    root?.render(
      <List>
        <ListItem index={0} onSelect={onSelect}>
          Item
        </ListItem>
      </List>
    )
  );
  container.querySelector<HTMLElement>('[role="option"]')!.focus();
  await act(async () => userEvent.keyboard(key));
  expect(onSelect).toHaveBeenCalledOnce();
});

test.each([false, true])(
  "uses vertical arrows between items and horizontal arrows within an item (inset: %s)",
  (inset) => {
    const Container = inset ? InsetList : "div";
    const Row = inset ? InsetListItem : "div";
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    act(() => {
      root?.render(
        <List asChild>
          <Container>
            {["First", "Second"].map((label, index) => (
              <ListItem asChild index={index} key={label}>
                <Row {...(inset ? { asChild: true } : {})}>
                  <div>
                    <span>{label}</span>
                    <button type="button" tabIndex={-1}>
                      {label} action
                    </button>
                  </div>
                </Row>
              </ListItem>
            ))}
          </Container>
        </List>
      );
    });

    const items = Array.from(
      container.querySelectorAll<HTMLElement>('[role="option"]')
    );
    const firstAction = container.querySelector<HTMLButtonElement>("button")!;
    items[0]?.focus();

    pressArrow(items[0]!, "ArrowDown");
    expect(document.activeElement).toBe(items[1]);

    pressArrow(items[1]!, "ArrowUp");
    expect(document.activeElement).toBe(items[0]);

    pressArrow(items[0]!, "ArrowRight");
    expect(document.activeElement).toBe(firstAction);
    pressArrow(firstAction, "ArrowDown");
    expect(document.activeElement).toBe(items[1]);
    pressArrow(items[1]!, "ArrowDown");
    expect(document.activeElement).toBe(items[0]);
    pressArrow(items[0]!, "ArrowRight");
    pressArrow(firstAction, "ArrowLeft");
    expect(document.activeElement).toBe(items[0]);
  }
);
