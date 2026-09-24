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
  const edit = document.querySelector<HTMLButtonElement>(
    'button[aria-label="Edit Content-Security-Policy for /"]'
  );
  act(() => edit?.click());
  const input = document.querySelector<HTMLInputElement>(
    'input[placeholder="Header value"]'
  );
  if (input === null) {
    throw new Error("Expected the header value field");
  }
  act(() => input.focus());
  return { input, onOpenChange };
};

const type = (input: HTMLInputElement, value: string) => {
  act(() => {
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

test("Escape cancels a header edit without dismissing Project Settings", async () => {
  const { input, onOpenChange } = render();
  type(input, "frame-ancestors https://example.com");
  await pressEscape(input);
  expect(
    document.querySelector<HTMLInputElement>(
      'input[placeholder="Header value"]'
    )?.value
  ).toBe("");
  expect(executeRuntimeMutation).not.toHaveBeenCalled();
  expect(onOpenChange).not.toHaveBeenCalled();

  const dialog = document.querySelector('[role="dialog"]');
  if (dialog === null) {
    throw new Error("Expected Project Settings to remain open");
  }
  // Escape outside the field retains normal dialog dismissal.
  await pressEscape(dialog);
  expect(onOpenChange).toHaveBeenCalledWith(false);
});

test.each(["denied", "throws"])(
  "keeps a failed draft and shows an error when saving %s",
  (failure) => {
    vi.mocked(executeRuntimeMutation).mockImplementation(() => {
      if (failure === "throws") {
        throw new Error("Runtime mutation failed");
      }
      return undefined;
    });
    const { input } = render();
    type(input, "frame-ancestors https://example.com");
    const save = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent === "Save"
    );
    act(() => save?.click());
    expect(input.value).toBe("frame-ancestors https://example.com");
    expect(document.body.textContent).toContain("Changes could not be saved");
    expect($projectSettings.get()?.meta.customHeaders).toBeUndefined();
  }
);

test("adds a route rule and keeps required site-wide headers nonremovable", () => {
  vi.mocked(executeRuntimeMutation).mockReturnValue({} as never);
  render();
  expect(
    document.querySelector(
      'button[aria-label="Remove Content-Security-Policy for /"]'
    )
  ).toBeNull();
  expect(
    document.querySelector('button[aria-label="Remove X-Frame-Options for /"]')
  ).not.toBeNull();
  const cancel = Array.from(document.querySelectorAll("button")).find(
    (button) => button.textContent === "Cancel"
  );
  act(() => cancel?.click());
  const route = document.querySelector<HTMLInputElement>(
    'input[placeholder="/ or /private/*"]'
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
