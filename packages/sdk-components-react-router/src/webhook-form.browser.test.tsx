import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, expect, test, vi } from "vitest";
import { formBotFieldName } from "@webstudio-is/sdk/runtime";
import { WebhookForm } from "./webhook-form";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("refreshes one bot timestamp when a Webhook Form is submitted again", async () => {
  const submissions: FormData[] = [];
  const router = createMemoryRouter(
    [
      {
        path: "/contact",
        element: (
          <WebhookForm action="form-id">
            <button type="submit">Send</button>
          </WebhookForm>
        ),
        action: async ({ request }) => {
          submissions.push(await request.formData());
          return { success: true };
        },
      },
    ],
    { initialEntries: ["/contact"] }
  );
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<RouterProvider router={router} />));

  const now = Date.now();
  const clock = vi.spyOn(Date, "now").mockReturnValue(now);
  const button = container.querySelector("button");
  expect(button).not.toBeNull();

  await act(async () => button?.click());
  await expect.poll(() => submissions.length).toBe(1);

  clock.mockReturnValue(now + 5 * 60 * 1000 + 1);
  await act(async () => button?.click());
  await expect.poll(() => submissions.length).toBe(2);

  expect(submissions[0]?.getAll(formBotFieldName)).toEqual([now.toString(16)]);
  expect(submissions[1]?.getAll(formBotFieldName)).toEqual([
    (now + 5 * 60 * 1000 + 1).toString(16),
  ]);
});
