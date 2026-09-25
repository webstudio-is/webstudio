import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { expect, test, vi } from "vitest";
import { userEvent } from "@vitest/browser/context";
import { SmallIconButton, TooltipProvider } from "@webstudio-is/design-system";
import {
  ProjectSettingsDeleteRuleButton,
  ProjectSettingsRuleList,
} from "./rule-list";

test("invalid route disables Add until corrected", () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const onSubmit = vi.fn(() => true);
  act(() => {
    root.render(
      <TooltipProvider>
        <ProjectSettingsRuleList
          fields={[
            {
              name: "route",
              placeholder: "Route",
              suggestions: [],
              validateOnChange: (value) =>
                value.startsWith("/") ? [] : ["Route must start with /"],
            },
          ]}
          validate={(values) => ({
            route: values.route?.startsWith("/")
              ? []
              : ["Route must start with /"],
          })}
          onSubmit={onSubmit}
          rules={[]}
          columns="1fr"
          columnLabels={["Path"]}
          label="Rules"
        />
      </TooltipProvider>
    );
  });
  const input = container.querySelector<HTMLInputElement>("input");
  const add = Array.from(container.querySelectorAll("button")).find(
    (button) => button.textContent === "Add"
  );
  if (!input || !add) {
    throw new Error("Expected the rule form");
  }
  const type = (value: string) => {
    act(() => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value"
      )?.set?.call(input, value);
      input.dispatchEvent(new InputEvent("input", { bubbles: true }));
    });
  };
  type("private");
  expect(add.disabled).toBe(true);
  expect(onSubmit).not.toHaveBeenCalled();
  type("/private");
  expect(add.disabled).toBe(false);
  act(() => add.click());
  expect(onSubmit).toHaveBeenCalledWith({ route: "/private" });
  act(() => root.unmount());
  container.remove();
});

test("rules expose table cells and support keyboard navigation to actions", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const onRemove = vi.fn();
  act(() => {
    root.render(
      <TooltipProvider>
        <ProjectSettingsRuleList
          fields={[]}
          validate={() => ({})}
          onSubmit={() => true}
          label="Response header rules"
          columnLabels={["Path", "Header"]}
          columns="1fr 1fr"
          rules={[
            {
              key: "one",
              values: ["/*", "Content-Security-Policy"],
            },
            {
              key: "two",
              values: ["/private", "X-Frame-Options"],
              actions: (
                <SmallIconButton
                  icon={<span>Remove</span>}
                  aria-label="Remove X-Frame-Options"
                  onClick={onRemove}
                />
              ),
            },
          ]}
        />
      </TooltipProvider>
    );
  });
  const table = container.querySelector('[role="table"]');
  const rows = Array.from(
    container.querySelectorAll<HTMLElement>('[role="row"]')
  );
  expect(table?.getAttribute("aria-label")).toBe("Response header rules");
  expect(container.querySelectorAll('[role="columnheader"]')).toHaveLength(3);
  expect(rows).toHaveLength(3);
  expect(rows[1]?.querySelectorAll('[role="cell"]')).toHaveLength(3);
  expect(rows[1]?.tabIndex).toBe(0);
  expect(rows[2]?.tabIndex).toBe(-1);
  const removeButton = rows[2]?.querySelector("button");
  expect(removeButton && getComputedStyle(removeButton).opacity).toBe("0");
  act(() => {
    rows[1]?.focus();
    rows[1]?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })
    );
  });
  expect(document.activeElement).toBe(rows[2]);
  expect(removeButton && getComputedStyle(removeButton).opacity).toBe("1");
  expect(rows[2]?.querySelector("button")?.getAttribute("aria-label")).toBe(
    "Remove X-Frame-Options"
  );
  removeButton?.focus();
  await act(async () => userEvent.keyboard("{Enter}"));
  expect(onRemove).toHaveBeenCalledOnce();
  removeButton?.focus();
  await act(async () => userEvent.keyboard("{Space}"));
  expect(onRemove).toHaveBeenCalledTimes(2);
  act(() => root.unmount());
  container.remove();
});

test("rule deletion requires confirmation", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const onDelete = vi.fn();
  act(() => {
    root.render(
      <TooltipProvider>
        <ProjectSettingsDeleteRuleButton
          label="Remove Cache-Control"
          description="Cache-Control for /*"
          onDelete={onDelete}
        />
      </TooltipProvider>
    );
  });
  const deleteButton = container.querySelector<HTMLButtonElement>(
    'button[aria-label="Remove Cache-Control"]'
  );
  if (!deleteButton) {
    throw new Error("Expected a delete button");
  }
  await act(async () => userEvent.click(deleteButton));
  expect(onDelete).not.toHaveBeenCalled();
  expect(document.body.textContent).toContain("delete Cache-Control for /*?");
  expect(document.body.textContent).not.toContain("cannot be undone");
  const cancelButton = Array.from(
    document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')
  ).find((button) => button.textContent === "Cancel");
  if (!cancelButton) {
    throw new Error("Expected a cancel button");
  }
  await act(async () => userEvent.click(cancelButton));
  expect(onDelete).not.toHaveBeenCalled();
  await act(async () => userEvent.click(deleteButton));
  const confirmButton = Array.from(
    document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')
  ).find((button) => button.textContent === "Delete");
  if (!confirmButton) {
    throw new Error("Expected a confirmation button");
  }
  await act(async () => userEvent.click(confirmButton));
  expect(onDelete).toHaveBeenCalledOnce();
  act(() => root.unmount());
  container.remove();
});
