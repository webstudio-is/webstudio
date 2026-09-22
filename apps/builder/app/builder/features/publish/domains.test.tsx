import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import { __testing__, PENDING_TIMEOUT, type Domain } from "./domains";

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
  age = 0,
  isLoading = false
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
    status: "ACTIVE",
    verified: true,
    latestBuildVirtual:
      publishStatus === undefined
        ? null
        : {
            publishStatus,
            createdAt: new Date(Date.now() - age).toISOString(),
          },
  } as Domain;
  act(() =>
    root?.render(
      <TooltipProvider>
        <StatusIcon projectDomain={projectDomain} isLoading={isLoading} />
      </TooltipProvider>
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
  expect(renderStatus("PENDING", 0, true)).toBe("rgb(100, 100, 100)");
  expect(renderStatus("PENDING", PENDING_TIMEOUT + 1000)).toBe(
    "rgb(200, 0, 0)"
  );
});

test("does not show success for a domain that has never been published", () => {
  expect(renderStatus(undefined)).toBe("rgb(100, 100, 100)");
});
