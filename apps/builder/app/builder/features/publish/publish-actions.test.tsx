import { createRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, expect, test, vi } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import { PublishActions, usePublishValidationState } from "./publish-actions";

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

const render = (
  validationState: "idle" | "passed",
  publishInProgress = false,
  publishDisabled = false
) => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(
      <TooltipProvider>
        <PublishActions
          validationState={validationState}
          validateDisabled={publishInProgress}
          publishDisabled={publishDisabled}
          publishInProgress={publishInProgress}
          hasSelectedDomains
          publishLabel="Publish"
          publishButtonRef={createRef<HTMLButtonElement>()}
          onValidate={vi.fn(async () => {})}
          onPublish={vi.fn()}
        />
      </TooltipProvider>
    );
  });
  return Array.from(container.querySelectorAll<HTMLButtonElement>("button"));
};

test("gives both actions equal width", () => {
  const [validate, publish] = render("idle");

  expect(validate.dataset.state).toBe("auto");
  expect(validate.dataset.buttonColor).toBe("positive");
  expect(validate).toBeEnabled();
  expect(publish).toBeEnabled();
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

test("clears the validation result when the publish popover closes", async () => {
  const Harness = () => {
    const [isOpen, setIsOpen] = useState(true);
    const { validationState, update, reset } =
      usePublishValidationState(isOpen);

    return (
      <TooltipProvider>
        {isOpen && (
          <PublishActions
            validationState={validationState}
            validateDisabled={false}
            publishDisabled={false}
            publishInProgress={false}
            hasSelectedDomains
            publishLabel="Publish"
            publishButtonRef={createRef<HTMLButtonElement>()}
            onValidate={async () => {
              update("passed");
            }}
            onPublish={vi.fn()}
          />
        )}
        <button
          type="button"
          onClick={() => {
            reset();
            setIsOpen(false);
          }}
        >
          Close
        </button>
        {isOpen === false && (
          <button type="button" onClick={() => setIsOpen(true)}>
            Open
          </button>
        )}
      </TooltipProvider>
    );
  };

  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root?.render(<Harness />));

  const [validate, , close] = Array.from(
    container.querySelectorAll<HTMLButtonElement>("button")
  );
  await act(async () => validate.click());
  expect(validate.textContent).toBe("Validated");

  act(() => close.click());
  const reopen =
    container.querySelector<HTMLButtonElement>("button:last-child");
  act(() => reopen?.click());

  const [reopenedValidate] = Array.from(
    container.querySelectorAll<HTMLButtonElement>("button")
  );
  expect(reopenedValidate.textContent).toBe("Validate");
  expect(reopenedValidate.querySelector("svg")).toBeNull();
});

test("shows publish progress and disables actions immediately", () => {
  const [validate, publish] = render("idle", true, true);

  expect(validate).toBeDisabled();
  expect(publish.dataset.state).toBe("pending");
  expect(publish).toBeDisabled();
  expect(publish.querySelector("svg")).not.toBeNull();
});

test("shows pending immediately after Validate is clicked", async () => {
  let resolveValidation: () => void = () => {};
  const validation = new Promise<void>((resolve) => {
    resolveValidation = resolve;
  });

  const Harness = () => {
    const [validationState, setValidationState] = useState<"idle" | "passed">(
      "idle"
    );

    return (
      <TooltipProvider>
        <PublishActions
          validationState={validationState}
          validateDisabled={false}
          publishDisabled={false}
          publishInProgress={false}
          hasSelectedDomains
          publishLabel="Publish"
          publishButtonRef={createRef<HTMLButtonElement>()}
          onValidate={async () => {
            await validation;
            setValidationState("passed");
          }}
          onPublish={vi.fn()}
        />
      </TooltipProvider>
    );
  };

  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root?.render(<Harness />));

  const [validate] = Array.from(
    container.querySelectorAll<HTMLButtonElement>("button")
  );
  act(() => validate.click());

  expect(validate.dataset.state).toBe("pending");
  expect(validate).toBeDisabled();
  expect(validate.querySelector("svg")).not.toBeNull();
  const [, publish] = Array.from(
    container.querySelectorAll<HTMLButtonElement>("button")
  );
  expect(publish).toBeDisabled();

  await act(async () => {
    resolveValidation();
    await validation;
  });

  expect(validate.textContent).toBe("Validated");
  expect(validate).toBeEnabled();
});
