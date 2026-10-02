import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { createMemoryRouter, RouterProvider } from "react-router";
import { expect, test, vi } from "vitest";
import {
  managedFormArrayNamesFieldName,
  managedFormIdFieldName,
  managedFormRequestParamName,
} from "@webstudio-is/sdk/runtime";
import { NativeForm } from "./native-form";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

test("managed Form posts its server identity and shows the action error", async () => {
  const submissions: FormData[] = [];
  const requestUrls: string[] = [];
  const stateChanges: string[] = [];
  const action = vi.fn(async ({ request }: { request: Request }) => {
    requestUrls.push(request.url);
    submissions.push(await request.formData());
    return { success: false, errors: ["Resource request failed (422)"] };
  });
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: (
          <NativeForm
            data-ws-managed-form-id="form-instance"
            submission={{ mode: "resources", destinations: ["resource-id"] }}
            onStateChange={(state) => stateChanges.push(state)}
          >
            <input name="message" defaultValue="Hello" />
            <input name="tag" defaultValue="first" />
            <input name="tag" defaultValue="second" />
            <input
              type="checkbox"
              name="selected"
              value="chosen"
              defaultChecked
            />
            <input type="checkbox" name="selected" value="other" />
            <input type="checkbox" name="empty" value="unused" />
            <input type="file" name="uploads" multiple />
            <button type="submit">Send</button>
          </NativeForm>
        ),
        action,
      },
    ],
    { initialEntries: ["/?source=staging"] }
  );
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);

  try {
    await act(async () => root.render(<RouterProvider router={router} />));
    const fileInput = container.querySelector<HTMLInputElement>(
      'input[name="uploads"]'
    );
    const files = new DataTransfer();
    files.items.add(
      new File(["original bytes"], "notes.txt", { type: "text/plain" })
    );
    if (fileInput) {
      fileInput.files = files.files;
    }
    await act(async () => {
      container.querySelector("button")?.click();
      await vi.waitFor(() => expect(submissions).toHaveLength(1));
    });
    const requestUrl = new URL(requestUrls[0]);
    expect(requestUrl.searchParams.get("source")).toBe("staging");
    expect(requestUrl.searchParams.get(managedFormRequestParamName)).toBe("1");
    expect(submissions[0].get(managedFormIdFieldName)).toBe("form-instance");
    expect(submissions[0].get("message")).toBe("Hello");
    expect(submissions[0].getAll("tag")).toEqual(["first", "second"]);
    expect(submissions[0].getAll("selected")).toEqual(["chosen"]);
    expect(submissions[0].getAll("empty")).toEqual([]);
    expect(
      new Set(
        JSON.parse(String(submissions[0].get(managedFormArrayNamesFieldName)))
      )
    ).toEqual(new Set(["tag", "selected", "empty", "uploads"]));
    const uploaded = submissions[0].get("uploads");
    expect(uploaded).toBeInstanceOf(File);
    expect((uploaded as File).name).toBe("notes.txt");
    expect((uploaded as File).type).toBe("text/plain");
    expect(await (uploaded as File).text()).toBe("original bytes");
    await vi.waitFor(() =>
      expect(container.querySelector('[role="alert"]')?.textContent).toBe(
        "Resource request failed (422)"
      )
    );
    expect(stateChanges).toEqual(["initial", "error"]);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

test("managed Form reports success after the action succeeds", async () => {
  const stateChanges: string[] = [];
  const action = vi.fn(async () => ({ success: true }));
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: (
          <NativeForm
            data-ws-managed-form-id="form-instance"
            submission={{ destinations: ["resource-id"] }}
            onStateChange={(state) => stateChanges.push(state)}
          >
            <input name="message" defaultValue="Hello" />
            <button type="submit">Send</button>
          </NativeForm>
        ),
        action,
      },
    ],
    { initialEntries: ["/"] }
  );
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);

  try {
    await act(async () => root.render(<RouterProvider router={router} />));
    await act(async () => {
      container.querySelector("button")?.click();
      await vi.waitFor(() => expect(action).toHaveBeenCalledOnce());
    });
    await vi.waitFor(() => expect(stateChanges).toContain("success"));
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
