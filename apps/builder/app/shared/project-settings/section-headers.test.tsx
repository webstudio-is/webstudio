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
  const input = document.querySelector("textarea");
  if (input === null) {
    throw new Error("Expected the CSP field");
  }
  act(() => input.focus());
  return { input, onOpenChange };
};

const type = (input: HTMLTextAreaElement, value: string) => {
  act(() => {
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
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
  expect(input.value).toBe("frame-ancestors 'self'");
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
    act(() => input.blur());
    expect(input.value).toBe("frame-ancestors https://example.com");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(document.body.textContent).toContain("Changes could not be saved");
    expect($projectSettings.get()?.meta.customHeaders).toBeUndefined();
  }
);
