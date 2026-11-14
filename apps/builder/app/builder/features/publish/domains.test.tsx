import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import { __testing__, type Domain } from "./domains";
import { PENDING_TIMEOUT } from "./publish-status";
import type { PublishLog } from "./use-publish-logs";

const { StatusIcon } = __testing__;
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
});

const renderStatus = (
  publishStatus: "PENDING" | "PUBLISHED" | "FAILED" | undefined,
  {
    age = 0,
    isLoading = false,
    latestLog,
    onOpenReport,
    onSectionClick,
  }: {
    age?: number;
    isLoading?: boolean;
    latestLog?: PublishLog;
    onOpenReport?: (domain: string) => void;
    onSectionClick?: () => void;
  } = {}
) => {
  if (container === undefined) {
    container = document.createElement("div");
    container.style.setProperty("--foreground-warning", "rgb(200, 160, 0)");
    container.style.setProperty("--foreground-positive", "rgb(0, 160, 0)");
    container.style.setProperty("--foreground-negative", "rgb(200, 0, 0)");
    container.style.setProperty("--foreground-secondary", "rgb(100, 100, 100)");
    document.body.appendChild(container);
    root = createRoot(container);
  }
  const projectDomain = {
    domain: "example.com",
    status: "ACTIVE",
    verified: true,
    latestBuildVirtual:
      publishStatus === undefined
        ? null
        : {
            buildId: "current-build",
            publishStatus,
            createdAt: new Date(Date.now() - age).toISOString(),
          },
  } as Domain;
  act(() =>
    root?.render(
      <div onClick={onSectionClick}>
        <TooltipProvider>
          <StatusIcon
            projectDomain={projectDomain}
            isLoading={isLoading}
            latestLog={latestLog}
            onOpenReport={onOpenReport}
          />
        </TooltipProvider>
      </div>
    )
  );
  const icon = container.querySelector("svg");
  expect(icon).not.toBeNull();
  return getComputedStyle(icon!).color;
};

test.each([
  { status: "PUBLISHED" as const, color: "rgb(0, 160, 0)" },
  { status: "FAILED" as const, color: "rgb(200, 0, 0)" },
])(
  "shows yellow while publishing, then the $status color",
  ({ status, color }) => {
    expect(renderStatus("PENDING")).toBe("rgb(200, 160, 0)");
    expect(renderStatus(status)).toBe(color);
  }
);

test("keeps status loading neutral and expired publishing red", () => {
  expect(renderStatus("PENDING")).toBe("rgb(200, 160, 0)");
  expect(renderStatus("PENDING", { isLoading: true })).toBe(
    "rgb(100, 100, 100)"
  );
  expect(renderStatus("PENDING", { age: PENDING_TIMEOUT + 1000 })).toBe(
    "rgb(200, 0, 0)"
  );
});

test("does not show success for a domain that has never been published", () => {
  expect(renderStatus(undefined)).toBe("rgb(100, 100, 100)");
});

test.each([
  ["pending", "rgb(200, 160, 0)"],
  ["failed", "rgb(200, 0, 0)"],
  ["success", "rgb(0, 160, 0)"],
] as const)(
  "uses the matching %s session log instead of the persisted status",
  (status, color) => {
    expect(
      renderStatus(status === "failed" ? "PUBLISHED" : "PENDING", {
        age: PENDING_TIMEOUT + 1000,
        latestLog: {
          buildId: "current-build",
          target: "site",
          domains: ["example.com"],
          findings: [],
          status,
        },
      })
    ).toBe(color);
  }
);

test("ignores a log for a different domain build", () => {
  expect(
    renderStatus("PUBLISHED", {
      latestLog: {
        buildId: "old-build",
        target: "site",
        domains: ["example.com"],
        findings: [],
        status: "failed",
      },
    })
  ).toBe("rgb(0, 160, 0)");
});

test("opening a domain report does not toggle the surrounding section", () => {
  const onOpenReport = vi.fn();
  const onSectionClick = vi.fn();
  renderStatus("PUBLISHED", { onOpenReport, onSectionClick });
  const event = new MouseEvent("click", { bubbles: true, cancelable: true });
  act(() =>
    container!
      .querySelector('button[aria-label="Publish log: example.com"]')
      ?.dispatchEvent(event)
  );
  expect(onOpenReport).toHaveBeenCalledExactlyOnceWith("example.com");
  expect(onSectionClick).not.toHaveBeenCalled();
  expect(event.defaultPrevented).toBe(true);
});
