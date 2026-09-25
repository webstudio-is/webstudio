import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import { $builderMode } from "~/shared/nano-states";
import { $projectSettings } from "~/shared/sync/data-stores";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { ProjectSettingsDialog } from "./project-settings";

vi.mock("~/shared/instance-utils/data", () => ({
  executeRuntimeMutation: vi.fn(),
}));
vi.mock("./section-general", () => ({ SectionGeneral: () => null }));
vi.mock("./section-agents", () => ({ SectionAgents: () => null }));
vi.mock("./section-auth", () => ({ SectionAuth: () => null }));
vi.mock("./section-redirects", () => ({ SectionRedirects: () => null }));
vi.mock("./section-publish", () => ({ SectionPublish: () => null }));
vi.mock("./section-marketplace", () => ({ SectionMarketplace: () => null }));
vi.mock("./section-backups", () => ({ SectionBackups: () => null }));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let previousSettings: ReturnType<typeof $projectSettings.get>;
let previousMode: ReturnType<typeof $builderMode.get>;

beforeEach(() => {
  previousSettings = $projectSettings.get();
  previousMode = $builderMode.get();
  $builderMode.set("design");
  $projectSettings.set({ meta: {}, compiler: {} });
  vi.mocked(executeRuntimeMutation).mockReset();
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = "";
  $projectSettings.set(previousSettings);
  $builderMode.set(previousMode);
});

const render = () => {
  const onOpenChange = vi.fn();
  act(() => {
    root.render(
      <TooltipProvider>
        <ProjectSettingsDialog
          currentSection="headers"
          onOpenChange={onOpenChange}
        />
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
  return { route, name, value, onOpenChange };
};

const type = (input: HTMLInputElement, value: string) => {
  act(() => {
    input.focus();
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value"
    )?.set?.call(input, value);
    input.dispatchEvent(new InputEvent("input", { bubbles: true }));
  });
};

const pressEscape = async (target: Element) => {
  await act(async () => {
    target.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      })
    );
    // Dialog dismissal runs on the next frame.
    await new Promise(requestAnimationFrame);
  });
};

test("Escape from the header form dismisses Project Settings", async () => {
  const { value, onOpenChange } = render();
  act(() => value.focus());
  await pressEscape(value);
  expect(onOpenChange).toHaveBeenCalledWith(false);
  expect(executeRuntimeMutation).not.toHaveBeenCalled();
});

test("offers standard names and values for the selected header", () => {
  const { name, value } = render();
  const options = (input: HTMLInputElement) =>
    Array.from(input.list?.options ?? []).map((option) => option.value);

  expect(options(name)).toContain("Cache-Control");
  expect(options(name)).not.toContain("X-Powered-By");
  type(name, "Cache-Control");
  expect(options(value)).toContain("no-store");
  type(name, "X-Custom-Header");
  expect(options(value)).toEqual([]);
});

test("Enter in an autocomplete field does not add a rule", () => {
  vi.mocked(executeRuntimeMutation).mockReturnValue({} as never);
  const { route, name, value } = render();
  type(route, "/*");
  type(name, "Cache-Control");
  type(value, "no-store");
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

test.each(["denied", "throws"])(
  "keeps form values and shows an error when saving %s",
  (failure) => {
    vi.mocked(executeRuntimeMutation).mockImplementation(() => {
      if (failure === "throws") {
        throw new Error("Runtime mutation failed");
      }
      return undefined;
    });
    const { route, name, value } = render();
    type(route, "/*");
    type(name, "Content-Security-Policy");
    type(value, "frame-ancestors https://example.com");
    const add = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent === "Add"
    );
    act(() => add?.click());
    expect(value.value).toBe("frame-ancestors https://example.com");
    expect(document.body.textContent).toContain("Changes could not be saved");
    expect($projectSettings.get()?.meta.customHeaders).toBeUndefined();
  }
);

test("starts with no rows and adds a route rule", () => {
  vi.mocked(executeRuntimeMutation).mockReturnValue({} as never);
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
  type(route, "/private/*");
  type(name, "Referrer-Policy");
  type(value, "no-referrer");
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

test("submitting an existing default header updates its value", () => {
  vi.mocked(executeRuntimeMutation).mockReturnValue({} as never);
  const { route, name, value } = render();
  type(route, "/*");
  type(name, "content-security-policy");
  type(value, "frame-ancestors https://example.com");
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

test("saves / as a root-only rule", () => {
  vi.mocked(executeRuntimeMutation).mockReturnValue({} as never);
  const { route, name, value } = render();
  type(route, "/");
  type(name, "Referrer-Policy");
  type(value, "no-referrer");
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

test("adds an arbitrary header and displays existing custom headers", () => {
  vi.mocked(executeRuntimeMutation).mockReturnValue({} as never);
  $projectSettings.set({
    meta: { customHeaders: [{ name: "Cache-Control", value: "no-store" }] },
    compiler: {},
  });
  const { route, name, value } = render();
  expect(document.body.textContent).toContain("Cache-Control");
  expect(
    document.querySelector('button[aria-label="Remove Cache-Control for /*"]')
  ).not.toBeNull();
  type(route, "/*");
  type(name, "Access-Control-Allow-Origin");
  type(value, "*");
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

test("deleting a custom site-wide header removes its rule", () => {
  vi.mocked(executeRuntimeMutation).mockReturnValue({} as never);
  $projectSettings.set({
    meta: { customHeaders: [{ name: "Cache-Control", value: "no-store" }] },
    compiler: {},
  });
  render();
  act(() =>
    document
      .querySelector<HTMLButtonElement>(
        'button[aria-label="Remove Cache-Control for /*"]'
      )
      ?.click()
  );
  expect(executeRuntimeMutation).toHaveBeenCalledWith({
    id: "projectSettings.update",
    input: { meta: { customHeaders: null } },
  });
});

test("deleting a configured fallback header leaves no settings rule", () => {
  vi.mocked(executeRuntimeMutation).mockReturnValue({} as never);
  $projectSettings.set({
    meta: {
      customHeaders: [
        { name: "Content-Security-Policy", value: "frame-ancestors 'none'" },
      ],
    },
    compiler: {},
  });
  render();
  act(() =>
    document
      .querySelector<HTMLButtonElement>(
        'button[aria-label="Remove Content-Security-Policy for /*"]'
      )
      ?.click()
  );
  expect(executeRuntimeMutation).toHaveBeenCalledWith({
    id: "projectSettings.update",
    input: { meta: { customHeaders: null } },
  });
});

test("empty route value cannot create a fallback-header rule", () => {
  vi.mocked(executeRuntimeMutation).mockReturnValue({} as never);
  const { route, name } = render();
  type(route, "/private/*");
  type(name, "Content-Security-Policy");
  const add = Array.from(document.querySelectorAll("button")).find(
    (button) => button.textContent === "Add"
  );
  act(() => add?.click());
  expect(executeRuntimeMutation).not.toHaveBeenCalled();
});
