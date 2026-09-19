import { createRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, expect, test, vi } from "vitest";
import { PublishActions } from "./publish-actions";

let root: Root | undefined;
let container: HTMLDivElement | undefined;

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  container?.remove();
  container = undefined;
});

const render = (validationState: "idle" | "pending" | "passed") => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(
      <PublishActions
        validationState={validationState}
        validateDisabled={false}
        publishDisabled={false}
        publishPending={false}
        publishInProgress={false}
        hasSelectedDomains
        publishLabel="Publish"
        publishButtonRef={createRef<HTMLButtonElement>()}
        onValidate={vi.fn()}
        onPublish={vi.fn()}
      />
    );
  });
  return Array.from(container.querySelectorAll<HTMLButtonElement>("button"));
};

test("shows validation progress while disabling both actions", () => {
  const [validate, publish] = render("pending");

  expect(validate.dataset.state).toBe("pending");
  expect(validate.dataset.buttonColor).toBe("positive");
  expect(validate).toBeDisabled();
  expect(validate.querySelector("svg")).not.toBeNull();
  expect(publish).toBeDisabled();
  expect(getComputedStyle(validate).flexGrow).toBe("1");
  expect(getComputedStyle(publish).flexGrow).toBe("1");
  expect(validate.getBoundingClientRect().width).toBe(
    publish.getBoundingClientRect().width
  );
});

test("shows the successful validation state in the action", () => {
  const [validate] = render("passed");

  expect(validate.textContent).toBe("Validated");
  expect(validate.dataset.buttonColor).toBe("positive");
  expect(validate.querySelector("svg")).not.toBeNull();
  expect(validate).toBeEnabled();
});
