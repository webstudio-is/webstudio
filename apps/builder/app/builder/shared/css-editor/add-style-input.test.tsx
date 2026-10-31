import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";
import { userEvent } from "@vitest/browser/context";
import { AddStyleInput } from "./add-style-input";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
});

const renderInput = () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const onSubmit = vi.fn(() => true);
  act(() => {
    root?.render(
      <AddStyleInput
        onClose={() => undefined}
        onSubmit={onSubmit}
        onFocus={() => undefined}
        onBlur={() => undefined}
      />
    );
  });
  return { container, onSubmit };
};

test("Shift+Enter opens the code editor with a newline and caret on the next line", async () => {
  const { container } = renderInput();
  const input = container.querySelector<HTMLInputElement>(
    'input[aria-label="Add styles"]'
  )!;
  await userEvent.click(input);
  await userEvent.type(input, "color: red;");
  await userEvent.keyboard("{Shift>}{Enter}{/Shift}");

  await vi.waitFor(() => {
    expect(document.body.querySelector(".cm-content")?.textContent).toContain(
      "color: red;"
    );
    expect(document.body.querySelectorAll(".cm-line")).toHaveLength(2);
    expect(document.activeElement).toBe(
      document.body.querySelector(".cm-content")
    );
  });
});

test("pasting multiple declarations opens the code editor and Enter starts another property", async () => {
  const { container } = renderInput();
  const input = container.querySelector<HTMLInputElement>(
    'input[aria-label="Add styles"]'
  )!;
  const clipboardData = new DataTransfer();
  clipboardData.setData("text/plain", "color: red;\nbackground: blue");
  act(() => {
    input.dispatchEvent(
      new ClipboardEvent("paste", { bubbles: true, clipboardData })
    );
  });

  await vi.waitFor(() => {
    expect(document.body.querySelectorAll(".cm-line")).toHaveLength(2);
    expect(document.activeElement).toBe(
      document.body.querySelector(".cm-content")
    );
  });
  await userEvent.keyboard("{Enter}");
  expect(document.body.querySelectorAll(".cm-line")).toHaveLength(3);
  expect(document.body.querySelectorAll(".cm-line")[1].textContent).toBe(
    "background: blue;"
  );
});

test("removing the newline restores the property autocomplete input", async () => {
  const { container, onSubmit } = renderInput();
  const input = container.querySelector<HTMLInputElement>(
    'input[aria-label="Add styles"]'
  )!;
  await userEvent.click(input);
  await userEvent.type(input, "color");
  await userEvent.keyboard("{Shift>}{Enter}{/Shift}");
  await vi.waitFor(() =>
    expect(document.body.querySelector(".cm-content")).not.toBeNull()
  );
  await userEvent.keyboard("{Backspace}");
  await vi.waitFor(() => {
    expect(document.body.querySelector(".cm-content")).toBeNull();
    expect(
      container.querySelector<HTMLInputElement>(
        'input[aria-label="Add styles"]'
      )?.value
    ).toBe("color");
  });
  expect(onSubmit).not.toHaveBeenCalled();
});

test("closing the code editor submits all entered declarations", async () => {
  const { container, onSubmit } = renderInput();
  const input = container.querySelector<HTMLInputElement>(
    'input[aria-label="Add styles"]'
  )!;
  const clipboardData = new DataTransfer();
  clipboardData.setData("text/plain", "color: red;\nbackground: blue;");
  act(() => {
    input.dispatchEvent(
      new ClipboardEvent("paste", { bubbles: true, clipboardData })
    );
  });
  await vi.waitFor(() => {
    expect(document.activeElement).toBe(
      document.body.querySelector(".cm-content")
    );
  });
  await userEvent.click(
    document.body.querySelector('[role="dialog"] button[aria-label="Close"]')!
  );
  await vi.waitFor(() =>
    expect(onSubmit).toHaveBeenCalledWith(
      "color: red;\nbackground: blue;",
      true
    )
  );
});
