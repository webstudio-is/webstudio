/**
 * @vitest-environment jsdom
 */
import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import type { Asset } from "@webstudio-is/sdk";
import { $assets } from "~/shared/sync/data-stores";
import { ContentBlockSourceControl } from "./content-block-source";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const asset: Asset = {
  id: "post",
  projectId: "project",
  name: "post.mdx",
  format: "mdx",
  size: 10,
  type: "file",
  meta: {},
  createdAt: "2026-01-01T00:00:00.000Z",
};
const targetAsset: Asset = { ...asset, id: "other", name: "other.mdx" };
let container: HTMLDivElement;
let root: Root;
const scrollIntoView = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "scrollIntoView"
);

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  $assets.set(new Map([asset, targetAsset].map((item) => [item.id, item])));
});

afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  $assets.set(new Map());
  if (scrollIntoView === undefined) {
    delete (HTMLElement.prototype as { scrollIntoView?: unknown })
      .scrollIntoView;
  } else {
    Object.defineProperty(
      HTMLElement.prototype,
      "scrollIntoView",
      scrollIntoView
    );
  }
});

const findButton = (label: string) => {
  const button = Array.from(
    document.body.querySelectorAll<HTMLButtonElement>("button")
  ).find((candidate) => candidate.textContent?.trim() === label);
  if (button === undefined) {
    throw new Error(`Expected button "${label}"`);
  }
  return button;
};

const chooseAsset = async (triggerLabel: string, assetName: string) => {
  await act(async () => {
    findButton(triggerLabel).click();
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve())
    );
  });
  const option = Array.from(
    document.body.querySelectorAll<HTMLElement>('[role="option"]')
  ).find((element) => element.textContent?.includes(assetName));
  const target = option?.querySelector<HTMLElement>(
    "[data-asset-thumbnail] > div"
  );
  if (target === undefined || target === null) {
    throw new Error(`Expected compatible Asset "${assetName}"`);
  }
  await act(async () => {
    target.click();
    await Promise.resolve();
  });
};

const renderControl = ({
  onRequestSource = async () => ({ status: "applied" as const }),
  onOpen = () => {},
  source = { type: "asset" as const, assetId: asset.id },
  resolvedAsset = asset,
  loading = false,
  diagnostics,
  persistenceStatus,
  persistenceError,
  onRetry,
}: {
  onRequestSource?: ComponentProps<
    typeof ContentBlockSourceControl
  >["onRequestSource"];
  onOpen?: ComponentProps<typeof ContentBlockSourceControl>["onOpen"];
  source?:
    | { type: "asset"; assetId: string }
    | { type: "expression"; value: string };
  resolvedAsset?: Asset;
  loading?: boolean;
  diagnostics?: ComponentProps<typeof ContentBlockSourceControl>["diagnostics"];
  persistenceStatus?: ComponentProps<
    typeof ContentBlockSourceControl
  >["persistenceStatus"];
  persistenceError?: string;
  onRetry?: () => Promise<void>;
} = {}) => {
  act(() => {
    root.render(
      <TooltipProvider>
        <ContentBlockSourceControl
          source={source}
          resolvedAsset={resolvedAsset}
          loading={loading}
          diagnostics={diagnostics}
          persistenceStatus={persistenceStatus}
          persistenceError={persistenceError}
          onRetry={onRetry}
          onRequestSource={onRequestSource}
          onOpen={onOpen}
        />
      </TooltipProvider>
    );
  });
};

test("shows a warning indicator for source diagnostics", () => {
  const diagnostic = {
    code: "ignored-template-prop" as const,
    severity: "warning" as const,
    blockInstanceId: "block",
    assetId: "post",
    contentRef: "post.mdx",
    renderScope: "collection:item-2",
    templateName: "Hero",
    propName: "tone",
    reason: "design-only" as const,
    sourceRange: {
      start: { line: 7, column: 4 },
      end: { line: 7, column: 12 },
    },
  };
  renderControl({
    diagnostics: [diagnostic, diagnostic],
  });

  expect(
    container.querySelector('[aria-label^="MDX source warning:"]')
  ).not.toBeNull();
  expect(container.textContent).not.toContain("Render scope:");
});

test("keeps the resolved filename visible while refreshed content loads", () => {
  renderControl({ loading: true });

  expect(findButton("post.mdx")).not.toBeNull();
  expect(findButton("Open").matches(":disabled")).toBe(true);
});

test("shows equal filename and Open actions for a connected source", () => {
  renderControl();

  const actions = document.querySelector(
    '[aria-label="Content source actions"]'
  );
  expect(
    Array.from(actions?.querySelectorAll("button") ?? []).map((button) =>
      button.textContent?.trim()
    )
  ).toEqual(["post.mdx", "Open"]);
});

test("opens the resolved Asset for a bound source", () => {
  const onOpen = vi.fn();
  renderControl({
    source: { type: "expression", value: "post.body" },
    resolvedAsset: targetAsset,
    onOpen,
  });

  act(() => findButton("Open").click());

  expect(onOpen).toHaveBeenCalledWith(targetAsset.id);
});

test("switches a connected source from the filename button", async () => {
  const onRequestSource = vi.fn(async () => ({ status: "applied" as const }));
  renderControl({ onRequestSource });

  await chooseAsset("post.mdx", "other.mdx");

  expect(onRequestSource).toHaveBeenCalledWith({
    source: { type: "asset", assetId: targetAsset.id },
    confirmed: undefined,
  });
});

test("shows the resolved filename while retaining a dynamic binding", () => {
  renderControl({ source: { type: "expression", value: "post.body" } });

  expect(findButton("post.mdx")).not.toBeNull();
  expect(container.querySelector('[data-variant="bound"]')).not.toBeNull();
});

test("shows only a full-width bindable connect button without a source", () => {
  act(() => {
    root.render(
      <TooltipProvider>
        <ContentBlockSourceControl
          onRequestSource={async () => ({ status: "applied" })}
          onOpen={() => {}}
        />
      </TooltipProvider>
    );
  });

  expect(document.querySelector("input")).toBeNull();
  expect(findButton("Connect .mdx file")).not.toBeNull();
  expect(document.body.textContent).not.toContain("Create MDX file");
});

test("asks for confirmation before connecting over existing content", async () => {
  const onRequestSource = vi
    .fn()
    .mockResolvedValueOnce({
      status: "requires-confirmation",
      diagnostics: [
        {
          code: "invalid-mdx",
          severity: "error",
          blockInstanceId: "block",
          assetId: "other",
          renderScope: "scope",
          message: "Unexpected closing tag.",
          sourceRange: {
            start: { line: 3, column: 2 },
            end: { line: 3, column: 4 },
          },
        },
      ],
    })
    .mockResolvedValueOnce({ status: "applied" });
  act(() => {
    root.render(
      <TooltipProvider>
        <ContentBlockSourceControl
          onRequestSource={onRequestSource}
          onOpen={() => {}}
        />
      </TooltipProvider>
    );
  });

  await chooseAsset("Connect .mdx file", "other.mdx");

  expect(document.body.textContent).toContain("Connect content source");
  expect(document.body.textContent).toContain(
    "The MDX file will not be changed."
  );
  expect(document.body.textContent).toContain(
    "Unexpected closing tag. Line 3, column 2."
  );
  const dialogButtons = Array.from(
    document.body.querySelectorAll<HTMLButtonElement>("button")
  )
    .map((button) => button.textContent?.trim())
    .filter((label) => label === "Connect" || label === "Abort");
  // DialogActions reverses DOM order so Abort is left and Connect is right.
  expect(dialogButtons).toEqual(["Connect", "Abort"]);
  expect(onRequestSource).toHaveBeenNthCalledWith(1, {
    source: { type: "asset", assetId: targetAsset.id },
    confirmed: undefined,
  });

  await act(async () => findButton("Connect").click());
  expect(onRequestSource).toHaveBeenNthCalledWith(2, {
    source: { type: "asset", assetId: targetAsset.id },
    confirmed: true,
  });
});

test("keeps a failed Asset write visible and retryable", async () => {
  const onRetry = vi.fn(async () => {});
  renderControl({
    persistenceStatus: "failed",
    persistenceError: "Temporary storage failure",
    onRetry,
  });

  expect(document.querySelector('[role="alert"]')?.textContent).toBe(
    "Temporary storage failure"
  );
  await act(async () => findButton("Retry").click());
  expect(onRetry).toHaveBeenCalledOnce();
});
