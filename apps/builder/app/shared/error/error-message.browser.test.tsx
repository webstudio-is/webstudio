import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test } from "vitest";
import { ErrorMessage } from "./error-message.client";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

test("renders without design-system global color variables", () => {
  act(() => {
    root.render(
      <ErrorMessage
        error={{
          status: 500,
          message: "Canvas failed to render",
        }}
      />
    );
  });

  const page = container.firstElementChild;
  const link = container.querySelector("a");
  const panel = link?.previousElementSibling;
  if (
    page instanceof HTMLElement === false ||
    panel instanceof HTMLElement === false ||
    link instanceof HTMLElement === false
  ) {
    throw new Error("Expected the error page, panel, and link");
  }

  expect(getComputedStyle(page).color).toBe("rgb(17, 24, 28)");
  expect(getComputedStyle(panel).backgroundColor).toBe("rgb(255, 255, 255)");
  expect(getComputedStyle(link).backgroundColor).toBe("rgb(9, 108, 255)");
  expect(getComputedStyle(link).color).toBe("rgb(255, 255, 255)");

  for (const state of ["hover", "pressed"]) {
    link.dataset.state = state;
    const style = getComputedStyle(link);
    expect(style.backgroundImage, state).not.toBe("none");
    expect(style.color, state).toBe("rgb(255, 255, 255)");
  }

  link.dataset.state = "focus";
  const focusStyle = getComputedStyle(link);
  expect(focusStyle.outlineColor).toBe("rgb(41, 122, 255)");
  expect(focusStyle.outlineStyle).not.toBe("none");
  expect(focusStyle.color).toBe("rgb(255, 255, 255)");
});
