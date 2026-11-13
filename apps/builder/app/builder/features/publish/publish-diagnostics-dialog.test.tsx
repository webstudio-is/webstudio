import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, expect, test, vi } from "vitest";
import { userEvent } from "@vitest/browser/context";
import { TooltipProvider } from "@webstudio-is/design-system";
import {
  PublishDiagnosticsDialog,
  type PublishValidationFinding,
} from "./publish-diagnostics-dialog";
import type { PublishLog } from "./use-publish-logs";

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

const render = (
  findings: PublishValidationFinding[],
  canViewPublishLogs = true,
  items: PublishLog[] = [],
  onLoadLog?: (item: PublishLog) => void,
  open?: boolean
) => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(
      <TooltipProvider>
        <PublishDiagnosticsDialog
          findings={findings}
          canViewPublishLogs={canViewPublishLogs}
          items={items}
          onLoadLog={onLoadLog}
          open={open}
        />
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
  expect(document.body.textContent).toContain("Errors");
  expect(document.body.textContent).toContain("Warnings");
  expect(document.body.textContent).toContain("error-5");
  expect(document.body.textContent).not.toContain("warning-0");
  expect(document.body.querySelectorAll('[role="tab"]')).toHaveLength(2);
  expect(
    getComputedStyle(document.body.querySelector('[role="dialog"]')!).resize
  ).toBe("both");
  expect(document.body.querySelector('[draggable="true"]')).not.toBeNull();
  const firstFinding = Array.from(
    document.body.querySelectorAll("button")
  ).find((button) => button.textContent === "error-0");
  expect(firstFinding).toBeDefined();
  await act(async () => userEvent.click(firstFinding as HTMLElement));
  const selectableText = Array.from(document.body.querySelectorAll("*")).find(
    (candidate) =>
      candidate.textContent === "details-error-0" &&
      getComputedStyle(candidate).userSelect === "text"
  );
  expect(selectableText).toBeDefined();
  const backButton = Array.from(document.body.querySelectorAll("button")).find(
    (button) => button.textContent === "Back"
  );
  await act(async () => userEvent.click(backButton as HTMLElement));

  const warningTab = Array.from(
    document.body.querySelectorAll('[role="tab"]')
  ).find((tab) => tab.textContent === "Warnings");
  await act(async () => userEvent.click(warningTab as HTMLElement));
  expect(document.body.textContent).toContain("warning-10");
  expect(document.body.textContent).not.toContain("error-0");
  const warningFinding = Array.from(
    document.body.querySelectorAll("button")
  ).find((button) => button.textContent === "warning-0");
  await act(async () => userEvent.click(warningFinding as HTMLElement));
  const warningBack = Array.from(document.body.querySelectorAll("button")).find(
    (button) => button.textContent === "Back"
  );
  await act(async () => userEvent.click(warningBack as HTMLElement));
  expect(
    Array.from(document.body.querySelectorAll('[role="tab"]'))
      .find((tab) => tab.textContent === "Warnings")
      ?.getAttribute("aria-selected")
  ).toBe("true");

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

test.each(["error", "warning"] as const)(
  "shows only the populated tab in the %s-only state",
  (severity) => {
    const element = render([createFinding(severity, 0)]);
    openDetails(element);
    expect(
      Array.from(document.body.querySelectorAll('[role="tab"]')).map(
        (tab) => tab.textContent
      )
    ).toEqual([severity === "error" ? "Errors" : "Warnings"]);
  }
);

test("Free shows the actual short error without details, navigation, or report copy", () => {
  const element = render(
    [
      {
        severity: "error",
        title: "article.mdx:2:3",
        summary: "Invalid MDX element nesting",
        details: "Private long diagnostic context",
        link: <button>Show element</button>,
        reportText: "Private long diagnostic context",
      },
    ],
    false
  );
  openDetails(element);
  expect(document.body.textContent).toContain("Invalid MDX element nesting");
  expect(document.body.textContent).not.toContain("article.mdx");
  expect(document.body.textContent).not.toContain(
    "Private long diagnostic context"
  );
  expect(document.body.textContent).not.toContain("Show element");
  expect(
    document.body.querySelector('[aria-label="Copy all reports"]')
  ).toBeNull();
});

test("Free hides log-derived issues, stage, and code", async () => {
  const element = render([createFinding("warning", 0)], false, [
    {
      buildId: "build-1",
      target: "site",
      domains: ["example.com"],
      findings: [],
      status: "failed",
      code: "private-code",
      failedStage: "private-stage",
      issues: [{ severity: "error", message: "private-log-issue" }],
    },
  ]);
  openDetails(element);
  const publishTab = Array.from(
    document.body.querySelectorAll('[role="tab"]')
  ).find((tab) => tab.textContent === "Publish");
  await act(async () => userEvent.click(publishTab as HTMLElement));
  expect(document.body.textContent).toContain("Publish failed");
  expect(document.body.textContent).not.toContain("private-code");
  expect(document.body.textContent).not.toContain("private-stage");
  expect(document.body.textContent).not.toContain("private-log-issue");
});

test("loads a completed publish when Publish opens and shows its log inline", async () => {
  const item: PublishLog = {
    buildId: "build-1",
    logHandle: "log-handle-1",
    target: "site",
    domains: ["example.com"],
    findings: [],
    status: "failed",
  };
  const onLoadLog = vi.fn();
  const element = render(
    [createFinding("warning", 0)],
    true,
    [item],
    onLoadLog
  );
  openDetails(element);
  expect(onLoadLog).not.toHaveBeenCalled();
  const publishTab = Array.from(
    document.body.querySelectorAll('[role="tab"]')
  ).find((tab) => tab.textContent === "Publish");
  await act(async () => userEvent.click(publishTab as HTMLElement));
  expect(onLoadLog).toHaveBeenCalledWith(item);

  item.logState = "available";
  item.logText = "Unstructured runner output";
  act(() => {
    root?.render(
      <TooltipProvider>
        <PublishDiagnosticsDialog
          findings={[createFinding("warning", 0)]}
          items={[item]}
          onLoadLog={onLoadLog}
        />
      </TooltipProvider>
    );
  });
  expect(document.body.textContent).toContain("Unstructured runner output");
  expect(document.body.textContent).not.toContain("View detailed report");
});

test("shows unavailable instead of loading forever when a publish has no log handle", async () => {
  const onLoadLog = vi.fn();
  const element = render(
    [createFinding("warning", 0)],
    true,
    [
      {
        buildId: "build-1",
        target: "site",
        domains: ["example.com"],
        findings: [],
        status: "failed",
      },
    ],
    onLoadLog
  );
  openDetails(element);
  const publishTab = Array.from(
    document.body.querySelectorAll('[role="tab"]')
  ).find((tab) => tab.textContent === "Publish");
  await act(async () => userEvent.click(publishTab as HTMLElement));
  expect(onLoadLog).not.toHaveBeenCalled();
  expect(document.body.textContent).toContain("Publish logs are unavailable.");
});

test("lists each publish domain and copies the full loaded log", async () => {
  const writeText = vi.fn(async (_text: string) => {});
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  render(
    [],
    true,
    [
      {
        buildId: "build-1",
        target: "site",
        domains: ["first.example", "second.example"],
        findings: [],
        status: "failed",
        logState: "available",
        logText: "First complete runner log",
      },
      {
        buildId: "build-2",
        target: "site",
        domains: ["third.example"],
        findings: [],
        status: "success",
        logState: "available",
        logText: "Second complete runner log",
      },
    ],
    undefined,
    true
  );
  expect(document.body.textContent).toContain("first.example");
  expect(document.body.textContent).toContain("second.example");
  expect(document.body.textContent).toContain("third.example");
  expect(document.body.textContent).not.toContain(
    "first.example, second.example"
  );
  const copyButton = document.body.querySelector<HTMLButtonElement>(
    'button[aria-label="Copy all reports"]'
  );
  expect(copyButton).not.toBeNull();
  await act(async () => userEvent.click(copyButton!));
  expect(writeText).toHaveBeenCalledOnce();
  const copied = writeText.mock.calls[0][0];
  expect(copied).toContain("First complete runner log");
  expect(copied).toContain("Second complete runner log");
  expect(copied).toContain("first.example");
  expect(copied).toContain("second.example");
  expect(copied).toContain("third.example");
});

test("collapses each complete publish and copies its full log from the header", async () => {
  const writeText = vi.fn(async (_text: string) => {});
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  render(
    [],
    true,
    [
      {
        buildId: "build-1",
        target: "site",
        domains: ["first.example"],
        findings: [],
        status: "failed",
        logState: "available",
        logText: "Complete first publish log",
      },
      {
        buildId: "build-2",
        target: "site",
        domains: ["second.example"],
        findings: [],
        status: "success",
        logState: "available",
        logText: "Complete second publish log",
      },
    ],
    undefined,
    true
  );
  const triggers = Array.from(
    document.body.querySelectorAll<HTMLButtonElement>("button[aria-labelledby]")
  );
  expect(triggers).toHaveLength(2);
  expect(triggers[0]?.getAttribute("aria-expanded")).toBe("false");
  expect(triggers[1]?.getAttribute("aria-expanded")).toBe("true");
  expect(document.body.textContent).toContain("Complete first publish log");
  expect(document.body.textContent).not.toContain(
    "Complete second publish log"
  );
  await act(async () => userEvent.click(triggers[0]!));
  expect(document.body.textContent).toContain("Complete second publish log");
  const copyButtons = document.body.querySelectorAll<HTMLButtonElement>(
    'button[aria-label="Copy log"]'
  );
  expect(copyButtons).toHaveLength(2);
  await act(async () => userEvent.click(copyButtons[0]!));
  expect(writeText).toHaveBeenCalledWith("Complete second publish log");
  expect(triggers[0]?.getAttribute("aria-expanded")).toBe("true");
});

test("publish failure is plain text and links to the Publish tab", async () => {
  render(
    [
      {
        severity: "error",
        source: "publish",
        title: "Build failed before deployment",
        summary: "Build failed before deployment",
        reportText: "Build failed before deployment",
      },
    ],
    true,
    [
      {
        buildId: "build-1",
        target: "site",
        domains: ["first.example"],
        findings: [],
        status: "failed",
      },
    ],
    undefined,
    true
  );
  expect(document.body.textContent).toContain("Build failed before deployment");
  expect(document.body.textContent).not.toContain("Audit");
  expect(
    Array.from(document.body.querySelectorAll("button")).some(
      (button) => button.textContent === "Build failed before deployment"
    )
  ).toBe(false);
  const publishLink = Array.from(document.body.querySelectorAll("button")).find(
    (button) =>
      button.getAttribute("role") !== "tab" &&
      button.textContent === "show logs"
  );
  expect(publishLink).toBeDefined();
  expect(publishLink?.parentElement?.textContent).toContain(
    "Build failed before deployment"
  );
  await act(async () => userEvent.click(publishLink!));
  expect(
    Array.from(document.body.querySelectorAll('[role="tab"]'))
      .find((tab) => tab.textContent === "Publish")
      ?.getAttribute("aria-selected")
  ).toBe("true");
});

test("Free publish failures link to a Publish upgrade banner without exposing logs", async () => {
  render(
    [
      {
        severity: "error",
        source: "publish",
        title: "Publish failed",
        reportText: "Publish failed",
      },
    ],
    false,
    [
      {
        buildId: "build-1",
        target: "site",
        domains: ["first.example"],
        findings: [],
        status: "failed",
        logState: "available",
        logText: "private runner output",
      },
    ],
    undefined,
    true
  );
  expect(document.body.textContent).toContain("Publish failed");
  const link = Array.from(document.body.querySelectorAll("button")).find(
    (button) => button.textContent === "show logs"
  );
  expect(link).toBeDefined();
  await act(async () => userEvent.click(link!));
  expect(
    document.body.querySelector('[role="tab"][aria-selected="true"]')
      ?.textContent
  ).toBe("Publish");
  expect(
    document.body.querySelector(
      '[role="tabpanel"][data-state="active"] [role="note"]'
    )
  ).not.toBeNull();
  expect(document.body.textContent).not.toContain("private runner output");
});

test("lists publishes oldest first and opens the newest entry", () => {
  render(
    [],
    true,
    [
      {
        buildId: "new",
        target: "site",
        domains: ["new.example"],
        findings: [],
        status: "success",
      },
      {
        buildId: "old",
        target: "site",
        domains: ["old.example"],
        findings: [],
        status: "failed",
      },
    ],
    undefined,
    true
  );
  const triggers = Array.from(
    document.body.querySelectorAll<HTMLButtonElement>("button[aria-labelledby]")
  );
  const labels = triggers.map(
    (button) =>
      document.getElementById(button.getAttribute("aria-labelledby") ?? "")
        ?.textContent
  );
  expect(labels).toEqual(["old.example", "new.example"]);
  expect(triggers[0]?.getAttribute("aria-expanded")).toBe("false");
  expect(triggers[1]?.getAttribute("aria-expanded")).toBe("true");
});

test("pre-dispatch failure has no link to an absent Publish tab", () => {
  render(
    [
      {
        severity: "error",
        source: "publish",
        title: "Publish request failed",
        reportText: "Publish request failed",
      },
    ],
    true,
    [],
    undefined,
    true
  );
  expect(document.body.textContent).toContain("Publish request failed");
  expect(document.body.textContent).not.toContain("Audit");
  expect(
    Array.from(document.body.querySelectorAll("button")).some(
      (button) => button.textContent === "Publish request failed"
    )
  ).toBe(false);
  expect(document.body.querySelector('[role="tab"]')?.textContent).toBe(
    "Errors"
  );
  expect(
    Array.from(document.body.querySelectorAll("button")).some(
      (button) => button.textContent === "Publish"
    )
  ).toBe(false);
});

test("Free audit summaries do not expose long cached details", () => {
  const longSummary = `Short reason ${"private context ".repeat(30)}`;
  const element = render(
    [
      {
        severity: "error",
        title: longSummary,
        summary: longSummary,
        reportText: longSummary,
      },
    ],
    false
  );
  openDetails(element);
  expect(document.body.textContent).toContain("Short reason");
  expect(document.body.textContent).not.toContain(longSummary);
});

test("Show element closes the diagnostics dialog on ordinary navigation", async () => {
  const element = render([
    {
      severity: "error",
      title: "Invalid element",
      link: <a href="#element">Show element</a>,
      reportText: "Invalid element",
    },
  ]);
  openDetails(element);
  const finding = Array.from(document.body.querySelectorAll("button")).find(
    (button) => button.textContent === "Invalid element"
  );
  await act(async () => userEvent.click(finding as HTMLElement));
  const link =
    document.body.querySelector<HTMLAnchorElement>('a[href="#element"]');
  expect(link).not.toBeNull();
  await act(async () => userEvent.click(link as HTMLElement));
  expect(document.body.querySelector('[role="dialog"]')).toBeNull();
});
