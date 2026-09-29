import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, expect, test, vi } from "vitest";
import { userEvent } from "@vitest/browser/context";
import { TooltipProvider } from "@webstudio-is/design-system";
import {
  PublishValidationResults,
  type PublishValidationFinding,
} from "./publish-validation-results";

let root: Root | undefined;
let container: HTMLDivElement | undefined;
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  container?.remove();
  container = undefined;
  vi.restoreAllMocks();
});

const render = (findings: PublishValidationFinding[]) => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(
      <TooltipProvider>
        <PublishValidationResults findings={findings} />
      </TooltipProvider>
    );
  });
  return container;
};

const createFinding = (
  severity: PublishValidationFinding["severity"],
  index: number
): PublishValidationFinding => ({
  severity,
  title: `${severity}-${index}`,
  details: `details-${severity}-${index}`,
  reportText: `${severity.toUpperCase()} report-${index}`,
});

const openDetails = (element: HTMLElement) => {
  const button = Array.from(element.querySelectorAll("button")).find(
    (candidate) => candidate.textContent === "See issues"
  );
  expect(button).toBeDefined();
  act(() => button?.click());
};

test("renders no publish summary when there are no findings", () => {
  expect(render([]).textContent).toBe("");
});

test("shows all mixed findings, counted tabs, selectable text, and copy-all", async () => {
  const findings = [
    ...Array.from({ length: 6 }, (_, index) => createFinding("error", index)),
    ...Array.from({ length: 11 }, (_, index) =>
      createFinding("warning", index)
    ),
  ];
  const writeText = vi.fn(async (_text: string) => {});
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });

  const element = render(findings);
  expect(element.textContent).toContain("6 errors · 11 warnings");
  openDetails(element);

  expect(document.body.textContent).toContain("Diagnostics");
  expect(document.body.textContent).toContain("Errors (6)");
  expect(document.body.textContent).toContain("Warnings (11)");
  expect(document.body.textContent).toContain("error-5");
  expect(document.body.textContent).not.toContain("warning-0");
  expect(document.body.querySelectorAll('[role="tab"]')).toHaveLength(2);
  expect(
    getComputedStyle(document.body.querySelector('[role="dialog"]')!).resize
  ).toBe("both");
  expect(document.body.querySelector('[draggable="true"]')).not.toBeNull();
  const selectableText = Array.from(document.body.querySelectorAll("div")).find(
    (candidate) => candidate.textContent === "details-error-0"
  );
  expect(selectableText).toBeDefined();
  expect(getComputedStyle(selectableText!).userSelect).toBe("text");

  const warningTab = Array.from(
    document.body.querySelectorAll('[role="tab"]')
  ).find((tab) => tab.textContent === "Warnings (11)");
  await act(async () => userEvent.click(warningTab as HTMLElement));
  expect(document.body.textContent).toContain("warning-10");
  expect(document.body.textContent).not.toContain("error-0");

  const copyButton = document.body.querySelector<HTMLButtonElement>(
    'button[aria-label="Copy all reports"]'
  );
  expect(copyButton).not.toBeNull();
  await act(async () => {
    copyButton?.click();
  });
  expect(writeText).toHaveBeenCalledOnce();
  const copiedReport = writeText.mock.calls[0][0];
  expect(copiedReport).toContain("ERROR report-5");
  expect(copiedReport).toContain("WARNING report-10");
});

test.each([
  { severity: "error" as const, otherTab: "Warnings (0)" },
  { severity: "warning" as const, otherTab: "Errors (0)" },
])(
  "hides the empty tab in the $severity-only state",
  ({ severity, otherTab }) => {
    const element = render([createFinding(severity, 0)]);
    openDetails(element);

    expect(document.body.textContent).not.toContain(otherTab);
    expect(document.body.querySelectorAll('[role="tab"]')).toHaveLength(1);
  }
);
