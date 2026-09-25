import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { page } from "@vitest/browser/context";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import { $projectSettings } from "~/shared/sync/data-stores";
import { SectionHeaders } from "./section-headers";

const executeRuntimeMutation = vi.fn(() => ({}) as never);

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let previousSettings: ReturnType<typeof $projectSettings.get>;

beforeEach(() => {
  previousSettings = $projectSettings.get();
  $projectSettings.set({ meta: {}, compiler: {} });
  executeRuntimeMutation.mockReset().mockImplementation(() => ({}) as never);
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = "";
  $projectSettings.set(previousSettings);
});

const render = () => {
  act(() => {
    root.render(
      <TooltipProvider>
        <SectionHeaders executeMutation={executeRuntimeMutation} />
      </TooltipProvider>
    );
  });
  const route = document.querySelector<HTMLInputElement>(
    'input[placeholder="/* or /private/*"]'
  );
  const name = document.querySelector<HTMLInputElement>(
    'input[placeholder="Header name"]'
  );
  const value = document.querySelector<HTMLInputElement>(
    'input[placeholder="Header value"]'
  );
  if (!route || !name || !value) {
    throw new Error("Expected the rule form");
  }
  return { route, name, value };
};

const type = async (input: HTMLInputElement, value: string) => {
  await act(async () => page.getByPlaceholder(input.placeholder).fill(value));
};

test("offers standard names and values for the selected header", async () => {
  executeRuntimeMutation.mockReturnValue({} as never);
  const { route, name, value } = render();
  await type(route, "/*");
  await type(name, "Cache");
  const options = () =>
    Array.from(document.querySelectorAll('[role="option"]')).map(
      (option) => option.textContent
    );
  expect(options()).toContain("Cache-Control");
  expect(options()).not.toContain("X-Powered-By");
  await act(async () =>
    page.getByRole("option", { name: "Cache-Control", exact: true }).click()
  );
  expect(
    document.querySelector<HTMLInputElement>('input[placeholder="Header name"]')
      ?.value
  ).toBe("Cache-Control");
  await type(value, "no");
  expect(options()).toContain("no-store");
  await act(async () =>
    page.getByRole("option", { name: "no-store", exact: true }).click()
  );
  expect(
    document.querySelector<HTMLInputElement>(
      'input[placeholder="Header value"]'
    )?.value
  ).toBe("no-store");
  await act(async () =>
    page.getByRole("button", { name: "Add", exact: true }).click()
  );
  expect(executeRuntimeMutation).toHaveBeenCalledWith({
    id: "projectSettings.update",
    input: {
      meta: {
        customHeaders: [{ name: "Cache-Control", value: "no-store" }],
      },
    },
  });
  expect(
    document.querySelector<HTMLInputElement>('input[placeholder="Header name"]')
      ?.value
  ).toBe("");
  expect(
    document.querySelector<HTMLInputElement>(
      'input[placeholder="Header value"]'
    )?.value
  ).toBe("");
});

test("Enter in an autocomplete field does not add a rule", async () => {
  executeRuntimeMutation.mockReturnValue({} as never);
  const { route, name, value } = render();
  await type(route, "/*");
  await type(name, "Cache-Control");
  await type(value, "no-store");
  act(() => {
    value.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      })
    );
  });
  expect(executeRuntimeMutation).not.toHaveBeenCalled();
  const add = Array.from(document.querySelectorAll("button")).find(
    (button) => button.textContent === "Add"
  );
  act(() => add?.click());
  expect(executeRuntimeMutation).toHaveBeenCalledOnce();
});

test("typing a non-customizable header cannot save a rule", async () => {
  executeRuntimeMutation.mockReturnValue({} as never);
  const { route, name, value } = render();
  await type(route, "/*");
  await type(name, "sEt-CoOkIe");
  await type(value, "session=override");
  await act(async () =>
    page.getByRole("button", { name: "Add", exact: true }).click()
  );
  expect(executeRuntimeMutation).not.toHaveBeenCalled();
  expect(
    document.querySelector<HTMLInputElement>('input[placeholder="Header name"]')
      ?.value
  ).toBe("sEt-CoOkIe");
});

test.each(["denied", "throws"])(
  "keeps form values and shows an error when saving %s",
  async (failure) => {
    executeRuntimeMutation.mockImplementation(() => {
      if (failure === "throws") {
        throw new Error("Runtime mutation failed");
      }
      return undefined as never;
    });
    const { route, name, value } = render();
    await type(route, "/*");
    await type(name, "Content-Security-Policy");
    await type(value, "frame-ancestors https://example.com");
    await act(async () =>
      page.getByRole("button", { name: "Add", exact: true }).click()
    );
    expect(
      document.querySelector<HTMLInputElement>(
        'input[placeholder="Header value"]'
      )?.value
    ).toBe("frame-ancestors https://example.com");
    expect(document.body.textContent).toContain("Changes could not be saved");
    expect($projectSettings.get()?.meta.customHeaders).toBeUndefined();
  }
);

test("starts with no rows and adds a route rule", async () => {
  executeRuntimeMutation.mockReturnValue({} as never);
  render();
  expect(document.querySelector('[role="table"]')).toBeNull();
  const { route, name, value } = {
    route: document.querySelector<HTMLInputElement>(
      'input[placeholder="/* or /private/*"]'
    ),
    name: document.querySelector<HTMLInputElement>(
      'input[placeholder="Header name"]'
    ),
    value: document.querySelector<HTMLInputElement>(
      'input[placeholder="Header value"]'
    ),
  };
  if (!route || !name || !value) {
    throw new Error("Expected the rule form");
  }
  await type(route, "/private/*");
  await type(name, "Referrer-Policy");
  await type(value, "no-referrer");
  const add = Array.from(document.querySelectorAll("button")).find(
    (button) => button.textContent === "Add"
  );
  act(() => add?.click());
  expect(executeRuntimeMutation).toHaveBeenCalledWith({
    id: "projectSettings.update",
    input: {
      meta: {
        customHeaders: [
          {
            route: "/private/*",
            name: "Referrer-Policy",
            value: "no-referrer",
          },
        ],
      },
    },
  });
});

test("submitting an existing default header updates its value", async () => {
  executeRuntimeMutation.mockReturnValue({} as never);
  const { route, name, value } = render();
  await type(route, "/*");
  await type(name, "content-security-policy");
  await type(value, "frame-ancestors https://example.com");
  const add = Array.from(document.querySelectorAll("button")).find(
    (button) => button.textContent === "Add"
  );
  act(() => add?.click());
  expect(executeRuntimeMutation).toHaveBeenCalledWith({
    id: "projectSettings.update",
    input: {
      meta: {
        customHeaders: [
          {
            name: "Content-Security-Policy",
            value: "frame-ancestors https://example.com",
          },
        ],
      },
    },
  });
});

test("saves / as a root-only rule", async () => {
  executeRuntimeMutation.mockReturnValue({} as never);
  const { route, name, value } = render();
  await type(route, "/");
  await type(name, "Referrer-Policy");
  await type(value, "no-referrer");
  const add = Array.from(document.querySelectorAll("button")).find(
    (button) => button.textContent === "Add"
  );
  act(() => add?.click());
  expect(executeRuntimeMutation).toHaveBeenCalledWith({
    id: "projectSettings.update",
    input: {
      meta: {
        customHeaders: [
          { route: "/", name: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    },
  });
});

test("adds an arbitrary header and displays existing custom headers", async () => {
  executeRuntimeMutation.mockReturnValue({} as never);
  $projectSettings.set({
    meta: { customHeaders: [{ name: "Cache-Control", value: "no-store" }] },
    compiler: {},
  });
  const { route, name, value } = render();
  expect(document.body.textContent).toContain("Cache-Control");
  expect(
    document.querySelector('button[aria-label="Remove Cache-Control for /*"]')
  ).not.toBeNull();
  await type(route, "/*");
  await type(name, "Access-Control-Allow-Origin");
  await type(value, "*");
  const add = Array.from(document.querySelectorAll("button")).find(
    (button) => button.textContent === "Add"
  );
  act(() => add?.click());
  expect(executeRuntimeMutation).toHaveBeenCalledWith({
    id: "projectSettings.update",
    input: {
      meta: {
        customHeaders: [
          { name: "Access-Control-Allow-Origin", value: "*" },
          { name: "Cache-Control", value: "no-store" },
        ],
      },
    },
  });
});

test("deleting a custom site-wide header requires confirmation", async () => {
  executeRuntimeMutation.mockReturnValue({} as never);
  $projectSettings.set({
    meta: { customHeaders: [{ name: "Cache-Control", value: "no-store" }] },
    compiler: {},
  });
  render();
  await act(async () =>
    page.getByRole("button", { name: "Remove Cache-Control for /*" }).click()
  );
  expect(executeRuntimeMutation).not.toHaveBeenCalled();
  expect(document.body.textContent).toContain("delete Cache-Control for /*");
  await act(async () => {
    await page.getByRole("button", { name: "Cancel" }).click();
    await new Promise(requestAnimationFrame);
  });
  expect(executeRuntimeMutation).not.toHaveBeenCalled();
  await act(async () =>
    page.getByRole("button", { name: "Remove Cache-Control for /*" }).click()
  );
  await act(async () =>
    page.getByRole("button", { name: "Delete", exact: true }).click()
  );
  expect(executeRuntimeMutation).toHaveBeenCalledWith({
    id: "projectSettings.update",
    input: { meta: { customHeaders: null } },
  });
});

test("deleting a configured fallback header leaves no settings rule", async () => {
  executeRuntimeMutation.mockReturnValue({} as never);
  $projectSettings.set({
    meta: {
      customHeaders: [
        { name: "Content-Security-Policy", value: "frame-ancestors 'none'" },
      ],
    },
    compiler: {},
  });
  render();
  await act(async () =>
    page
      .getByRole("button", { name: "Remove Content-Security-Policy for /*" })
      .click()
  );
  await act(async () =>
    page.getByRole("button", { name: "Delete", exact: true }).click()
  );
  expect(executeRuntimeMutation).toHaveBeenCalledWith({
    id: "projectSettings.update",
    input: { meta: { customHeaders: null } },
  });
});

test("shows an error when confirmed deletion cannot be saved", async () => {
  executeRuntimeMutation.mockReturnValue(undefined as never);
  $projectSettings.set({
    meta: { customHeaders: [{ name: "Cache-Control", value: "no-store" }] },
    compiler: {},
  });
  render();
  await act(async () =>
    page.getByRole("button", { name: "Remove Cache-Control for /*" }).click()
  );
  await act(async () =>
    page.getByRole("button", { name: "Delete", exact: true }).click()
  );
  expect(document.body.textContent).toContain("Changes could not be saved");
  expect(document.body.textContent).toContain("Cache-Control");
});

test("empty route value cannot create a fallback-header rule", async () => {
  executeRuntimeMutation.mockReturnValue({} as never);
  const { route, name } = render();
  await type(route, "/private/*");
  await type(name, "Content-Security-Policy");
  const add = Array.from(document.querySelectorAll("button")).find(
    (button) => button.textContent === "Add"
  );
  act(() => add?.click());
  expect(executeRuntimeMutation).not.toHaveBeenCalled();
});
