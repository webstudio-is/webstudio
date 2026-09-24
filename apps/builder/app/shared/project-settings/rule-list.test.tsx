import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { expect, test, vi } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import { ProjectSettingsRuleList } from "./rule-list";

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
