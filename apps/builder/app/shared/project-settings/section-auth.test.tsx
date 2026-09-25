import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { page, userEvent } from "@vitest/browser/context";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import { createBasicAuthRoute, serializeWsAuth } from "@webstudio-is/wsauth";
import { $projectSettings } from "~/shared/sync/data-stores";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { SectionAuth } from "./section-auth";

vi.mock("~/shared/instance-utils/data", () => ({
  executeRuntimeMutation: vi.fn(),
}));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let previousSettings: ReturnType<typeof $projectSettings.get>;

beforeEach(() => {
  previousSettings = $projectSettings.get();
  $projectSettings.set({
    meta: {
      auth: serializeWsAuth([
        createBasicAuthRoute({
          route: "/private",
          login: "admin",
          password: "secret",
        }),
      ]),
    },
    compiler: {},
  });
  vi.mocked(executeRuntimeMutation).mockReset();
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() =>
    root.render(
      <TooltipProvider>
        <SectionAuth />
      </TooltipProvider>
    )
  );
});

afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = "";
  $projectSettings.set(previousSettings);
});

test("deleting authentication requires confirmation", async () => {
  const deleteButton = document.querySelector<HTMLButtonElement>(
    'button[aria-label="Delete authentication for /private"]'
  );
  deleteButton?.focus();
  await act(async () => userEvent.keyboard("{Enter}"));
  expect(executeRuntimeMutation).not.toHaveBeenCalled();
  expect(document.body.textContent).toContain(
    "delete authentication for /private"
  );
  await act(async () => {
    await page.getByRole("button", { name: "Cancel" }).click();
    await new Promise(requestAnimationFrame);
  });
  expect(executeRuntimeMutation).not.toHaveBeenCalled();
  await act(async () =>
    page
      .getByRole("button", { name: "Delete authentication for /private" })
      .click()
  );
  document
    .querySelector<HTMLButtonElement>('button[data-button-color="destructive"]')
    ?.focus();
  await act(async () => userEvent.keyboard("{Enter}"));
  expect(executeRuntimeMutation).toHaveBeenCalledWith({
    id: "projectSettings.update",
    input: { meta: { auth: null } },
  });
});
