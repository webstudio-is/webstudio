import { useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, expect, test } from "vitest";
import { AddDomain } from "./add-domain";

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

test("shows the domain form only while requested and lets the user cancel", () => {
  const Harness = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <form>
        <button type="button" onClick={() => setIsOpen(true)}>
          Open domain form
        </button>
        <AddDomain
          projectId="project-id"
          isOpen={isOpen}
          onOpenChange={setIsOpen}
          onCreate={() => {}}
          refresh={async () => {}}
        />
      </form>
    );
  };

  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root?.render(<Harness />));

  expect(container.querySelector('input[name="domain"]')).toBeNull();
  expect(container.textContent).not.toContain("Export");

  const open = container.querySelector<HTMLButtonElement>("button");
  act(() => open?.click());

  expect(container.querySelector('input[name="domain"]')).not.toBeNull();
  expect(container.textContent).toContain("Add domain");

  const cancel = Array.from(
    container.querySelectorAll<HTMLButtonElement>("button")
  ).find((button) => button.textContent === "Cancel");
  act(() => cancel?.click());

  expect(container.querySelector('input[name="domain"]')).toBeNull();
});
