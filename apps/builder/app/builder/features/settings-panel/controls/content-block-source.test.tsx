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
  onDisconnect = async () => ({ status: "applied" as const }),
  onDisconnectingChange = () => {},
  onRequestSource = async () => ({ status: "applied" as const }),
  source = { type: "asset" as const, assetId: asset.id },
  disconnecting = false,
  loading = false,
  diagnostics,
  revision,
  persistenceStatus,
  persistenceError,
  onRetry,
  repeatedRenderScope,
}: {
  onDisconnect?: ComponentProps<
    typeof ContentBlockSourceControl
  >["onDisconnect"];
  onDisconnectingChange?: ComponentProps<
    typeof ContentBlockSourceControl
  >["onDisconnectingChange"];
  onRequestSource?: ComponentProps<
    typeof ContentBlockSourceControl
  >["onRequestSource"];
  source?:
    | { type: "asset"; assetId: string }
    | { type: "expression"; value: string };
  loading?: boolean;
  diagnostics?: ComponentProps<typeof ContentBlockSourceControl>["diagnostics"];
  revision?: string;
  persistenceStatus?: ComponentProps<
    typeof ContentBlockSourceControl
  >["persistenceStatus"];
  persistenceError?: string;
  onRetry?: () => Promise<void>;
  repeatedRenderScope?: boolean;
  disconnecting?: boolean;
} = {}) => {
  act(() => {
    root.render(
      <TooltipProvider>
        <ContentBlockSourceControl
          source={source}
          resolvedAsset={asset}
          loading={loading}
          diagnostics={diagnostics}
          revision={revision}
          persistenceStatus={persistenceStatus}
          persistenceError={persistenceError}
          onRetry={onRetry}
          repeatedRenderScope={repeatedRenderScope}
          disconnecting={disconnecting}
          onDisconnectingChange={onDisconnectingChange}
          onRequestSource={onRequestSource}
          onDisconnect={onDisconnect}
          onOpen={() => {}}
        />
      </TooltipProvider>
    );
  });
};

test("shows persistent actionable diagnostics with file, location, and render scope", () => {
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
    revision: "asset-revision-2",
  });

  expect(
    container.querySelector('[aria-label="MDX diagnostics"]')?.textContent
  ).toContain(
    'post.mdx: Property "tone" on template "Hero" was ignored because it is design only. Line 7, column 4.'
  );
  expect(container.textContent).toContain("Render scope: collection:item-2");
  expect(container.textContent).toContain("Revision: asset-revision-2");
  expect(
    container.querySelectorAll('[aria-label="MDX diagnostics"] > li')
  ).toHaveLength(1);
  expect(findButton("Open file to repair")).not.toBeNull();
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

test("switches a connected source from the filename button", async () => {
  const onRequestSource = vi.fn(async () => ({ status: "applied" as const }));
  renderControl({ onRequestSource });

  await chooseAsset("post.mdx", "other.mdx");

  expect(onRequestSource).toHaveBeenCalledWith({
    source: { type: "asset", assetId: targetAsset.id },
    confirmed: undefined,
  });
});

test("requires copying loaded file content before disconnecting", async () => {
  const onDisconnect = vi.fn(async () => ({ status: "applied" as const }));
  const onDisconnectingChange = vi.fn();
  renderControl({ onDisconnect, onDisconnectingChange, disconnecting: true });
  expect(document.body.textContent).toContain(
    "The current file content will be copied into the Content Block."
  );
  expect(
    Array.from(
      document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')
    )
      .map((button) => button.textContent?.trim())
      .filter((label) => label === "Abort" || label === "Confirm")
  ).toEqual(["Confirm", "Abort"]);
  expect(onDisconnect).not.toHaveBeenCalled();

  await act(async () => {
    findButton("Confirm").click();
  });
  expect(onDisconnect).toHaveBeenCalledOnce();
  expect(onDisconnectingChange).toHaveBeenCalledWith(false);
});

test("explains that disconnecting a repeated block changes every Collection item", () => {
  renderControl({ repeatedRenderScope: true, disconnecting: true });

  expect(document.body.textContent).toContain(
    "This source binding is shared by every Collection item."
  );
  expect(document.body.textContent).toContain("used by every item");
  expect(findButton("Abort")).not.toBeNull();
  expect(findButton("Confirm")).not.toBeNull();
});

test("keeps a partial lifecycle result visible without claiming complete success", async () => {
  renderControl({
    disconnecting: true,
    onDisconnect: async () => ({
      status: "partial",
      message: "The file was saved, but the Content Block was not connected.",
    }),
  });

  await act(async () => {
    findButton("Confirm").click();
  });

  expect(document.querySelector('[role="alert"]')?.textContent).toBe(
    "The file was saved, but the Content Block was not connected."
  );
  expect(document.body.textContent).toContain("Disconnect content source");
});

test("submits a disconnect only once while it is pending", async () => {
  let resolveDisconnect: (result: { status: "applied" }) => void = () => {};
  const onDisconnect = vi.fn(
    () =>
      new Promise<{ status: "applied" }>((resolve) => {
        resolveDisconnect = resolve;
      })
  );
  renderControl({ onDisconnect, disconnecting: true });
  const confirm = findButton("Confirm");
  act(() => {
    confirm.click();
    confirm.click();
  });

  expect(onDisconnect).toHaveBeenCalledOnce();
  await act(async () => resolveDisconnect({ status: "applied" }));
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
          onDisconnect={async () => ({ status: "applied" })}
          disconnecting={false}
          onDisconnectingChange={() => {}}
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
          onDisconnect={async () => ({ status: "applied" })}
          disconnecting={false}
          onDisconnectingChange={() => {}}
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
