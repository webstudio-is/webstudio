import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { userEvent } from "@vitest/browser/context";
import { afterEach, expect, test, vi } from "vitest";
import { __testing__ } from "./variable-popover";

import { SystemResourceForm } from "./resource-panel";

const { TypeField } = __testing__;
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
});

test("Email is selected within System resource, not as a top-level type", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const onChange = vi.fn();
  await act(async () =>
    root?.render(
      <>
        <TypeField value="email-resource" onChange={onChange} />
        <SystemResourceForm onKindChange={onChange} />
      </>
    )
  );

  const selects = container.querySelectorAll<HTMLButtonElement>("button");
  expect(selects[0].textContent).toContain("System resource");
  expect(selects[1].textContent).toContain("Sitemap");
  expect(container.textContent).not.toContain("Webstudio data");

  await act(async () => await userEvent.click(selects[0]));
  const topLevelOptions = Array.from(
    document.querySelectorAll<HTMLElement>('[role="option"]')
  ).map((option) => option.textContent?.replace(/Pro$/, ""));
  expect(
    topLevelOptions.some((option) => option?.startsWith("System resource"))
  ).toBe(true);
  expect(topLevelOptions).not.toContain("Email");
  await act(async () => await userEvent.keyboard("{Escape}"));

  await act(async () => await userEvent.click(selects[1]));
  const systemOptions = Array.from(
    document.querySelectorAll<HTMLElement>('[role="option"]')
  ).map((option) => option.textContent?.replace(/Pro$/, ""));
  expect(systemOptions).toEqual(["Sitemap", "Current date", "Assets", "Email"]);
  await act(
    async () =>
      await userEvent.click(
        Array.from(
          document.querySelectorAll<HTMLElement>('[role="option"]')
        ).find((option) => option.textContent === "Email")!
      )
  );
  expect(onChange).toHaveBeenCalledWith("email");
  expect(container.textContent).toContain("Recipient");
  expect(container.querySelectorAll('input[name="url"]')).toHaveLength(1);
  const resourceSelect =
    container.querySelectorAll<HTMLButtonElement>("button")[1];
  await act(async () => await userEvent.click(resourceSelect));
  await act(
    async () =>
      await userEvent.click(
        Array.from(
          document.querySelectorAll<HTMLElement>('[role="option"]')
        ).find((option) => option.textContent === "Current date")!
      )
  );
  expect(onChange).toHaveBeenCalledWith("system");
  expect(container.textContent).not.toContain("Recipient");
  expect(
    container.querySelector<HTMLInputElement>('input[name="url"]')?.value
  ).toContain("current-date");
});
