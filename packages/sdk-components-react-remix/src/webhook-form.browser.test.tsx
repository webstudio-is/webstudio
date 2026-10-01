import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, expect, test, vi } from "vitest";
import { formBotFieldName, formIdFieldName } from "@webstudio-is/sdk/runtime";
import { WebhookForm } from "./webhook-form";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let router: ReturnType<typeof createMemoryRouter> | undefined;

afterEach(() => {
  act(() => root?.unmount());
  router?.dispose();
  root = undefined;
  router = undefined;
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("retrying after six minutes submits one fresh bot field", async () => {
  const now = vi.spyOn(Date, "now").mockReturnValue(1_800_000_000_000);
  const submissions: FormData[] = [];
  const onStateChange = vi.fn();
  router = createMemoryRouter([
    {
      path: "/",
      element: (
        <WebhookForm action="resource-id" onStateChange={onStateChange}>
          <input name="email" defaultValue="ada@example.com" />
          <button type="submit">Submit</button>
        </WebhookForm>
      ),
      action: async ({ request }) => {
        submissions.push(await request.formData());
        return { success: submissions.length > 1 };
      },
    },
  ]);
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<RouterProvider router={router!} />));
  const form = container.querySelector("form")!;

  await act(async () => form.requestSubmit());
  expect(onStateChange).toHaveBeenLastCalledWith("error");
  expect(submissions[0].getAll(formBotFieldName)).toEqual([
    Date.now().toString(16),
  ]);

  now.mockReturnValue(Date.now() + 6 * 60_000);
  await act(async () => form.requestSubmit());
  expect(onStateChange).toHaveBeenLastCalledWith("success");
  expect(submissions[1].getAll(formBotFieldName)).toEqual([
    Date.now().toString(16),
  ]);
  expect(submissions[1].get(formIdFieldName)).toBe("resource-id");
  expect(submissions[1].get("email")).toBe("ada@example.com");
  expect(form.querySelectorAll(`[name="${formBotFieldName}"]`)).toHaveLength(1);
});
