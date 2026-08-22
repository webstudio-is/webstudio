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
const markdownAsset: Asset = {
  ...asset,
  id: "legacy",
  name: "legacy.md",
  format: "md",
};

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
  $assets.set(
    new Map([asset, targetAsset, markdownAsset].map((item) => [item.id, item]))
  );
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

const renderControl = ({
  onDisconnect = async () => ({ status: "applied" as const }),
  source = { type: "asset" as const, assetId: asset.id },
  loading = false,
  diagnostics,
}: {
  onDisconnect?: ComponentProps<
    typeof ContentBlockSourceControl
  >["onDisconnect"];
  source?:
    | { type: "asset"; assetId: string }
    | { type: "expression"; value: string };
  loading?: boolean;
  diagnostics?: ComponentProps<typeof ContentBlockSourceControl>["diagnostics"];
} = {}) => {
  act(() => {
    root.render(
      <TooltipProvider>
        <ContentBlockSourceControl
          source={source}
          resolvedAsset={asset}
          loading={loading}
          diagnostics={diagnostics}
          onRequestSource={async () => ({ status: "applied" })}
          onDisconnect={onDisconnect}
          onOpen={() => {}}
          onPreviewMarkdown={async () => {
            throw new Error("Not used");
          }}
          onCreateConvertedMdx={async () => undefined}
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
  });

  expect(
    container.querySelector('[aria-label="MDX diagnostics"]')?.textContent
  ).toContain(
    'post.mdx: Property "tone" on template "Hero" was ignored because it is design only. Line 7, column 4.'
  );
  expect(container.textContent).toContain("Render scope: collection:item-2");
  expect(
    container.querySelectorAll('[aria-label="MDX diagnostics"] > li')
  ).toHaveLength(1);
  expect(findButton("Open file to repair")).not.toBeNull();
});

test("keeps the resolved filename visible while refreshed content loads", () => {
  renderControl({ loading: true });

  expect(document.body.textContent).toContain("post.mdx");
  expect(findButton("Open").matches(":disabled")).toBe(true);
});

test("requires copying loaded file content before disconnecting", async () => {
  const onDisconnect = vi.fn(async () => ({ status: "applied" as const }));
  renderControl({ onDisconnect });

  act(() => findButton("Disconnect").click());
  expect(document.body.textContent).toContain(
    "The current file content will be copied into the Content Block."
  );
  expect(onDisconnect).not.toHaveBeenCalled();

  await act(async () => {
    findButton("Copy file content and disconnect").click();
  });
  expect(onDisconnect).toHaveBeenCalledOnce();
  expect(document.body.textContent).not.toContain(
    "The current file content will be copied into the Content Block."
  );
});

test("keeps a partial lifecycle result visible without claiming complete success", async () => {
  renderControl({
    onDisconnect: async () => ({
      status: "partial",
      message: "The file was saved, but the Content Block was not connected.",
    }),
  });

  act(() => findButton("Disconnect").click());
  await act(async () => {
    findButton("Copy file content and disconnect").click();
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
  renderControl({ onDisconnect });

  act(() => findButton("Disconnect").click());
  const confirm = findButton("Copy file content and disconnect");
  act(() => {
    confirm.click();
    confirm.click();
  });

  expect(onDisconnect).toHaveBeenCalledOnce();
  await act(async () => resolveDisconnect({ status: "applied" }));
});

test("shows the resolved filename while retaining a dynamic binding", () => {
  renderControl({ source: { type: "expression", value: "post.body" } });

  expect(container.textContent).toContain("post.mdx");
  expect(container.querySelector('[data-variant="bound"]')).not.toBeNull();
});

test("creates only a new MDX Asset from the source control", () => {
  renderControl();

  act(() => findButton("Create MDX file").click());

  expect(document.body.textContent).toContain("New MDX file");
  expect(
    document.querySelector<HTMLInputElement>("#asset-text-file-name")?.value
  ).toBe("untitled.mdx");
});

test("asks for confirmation before connecting over existing content", async () => {
  const onRequestSource = vi
    .fn()
    .mockResolvedValueOnce({ status: "requires-confirmation" })
    .mockResolvedValueOnce({ status: "applied" });
  act(() => {
    root.render(
      <TooltipProvider>
        <ContentBlockSourceControl
          onRequestSource={onRequestSource}
          onDisconnect={async () => ({ status: "applied" })}
          onOpen={() => {}}
          onPreviewMarkdown={async () => {
            throw new Error("Not used");
          }}
          onCreateConvertedMdx={async () => undefined}
        />
      </TooltipProvider>
    );
  });

  await act(async () => {
    findButton("Choose file").click();
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve())
    );
  });
  const targetOption = Array.from(
    document.body.querySelectorAll<HTMLElement>('[role="option"]')
  ).find((button) => button.textContent?.includes("other.mdx"));
  const target = targetOption?.querySelector<HTMLElement>(
    "[data-asset-thumbnail] > div"
  );
  if (target === undefined || target === null) {
    throw new Error("Expected compatible MDX Asset");
  }
  await act(async () => {
    target.click();
    await Promise.resolve();
  });

  expect(document.body.textContent).toContain("Connect content source");
  expect(document.body.textContent).toContain(
    "The MDX file will not be changed."
  );
  const dialogButtons = Array.from(
    document.body.querySelectorAll<HTMLButtonElement>("button")
  )
    .map((button) => button.textContent?.trim())
    .filter((label) => label === "Connect" || label === "Abort");
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

test("previews converted MDX and explains skipped Markdown before creation", async () => {
  const preview = {
    source: "# Converted\n",
    document: { frontmatter: { properties: {} }, children: [] },
    omissions: [
      {
        nodeType: "html",
        reason: "Unsupported HTML",
        sourceRange: {
          start: { line: 2, column: 1, offset: 12 },
          end: { line: 2, column: 8, offset: 19 },
        },
      },
    ],
  };
  const onPreviewMarkdown = vi.fn(async () => preview);
  const onCreateConvertedMdx = vi.fn(async () => "converted");
  const onRequestSource = vi.fn(async () => ({ status: "applied" as const }));
  act(() => {
    root.render(
      <TooltipProvider>
        <ContentBlockSourceControl
          source={{ type: "asset", assetId: asset.id }}
          resolvedAsset={asset}
          onRequestSource={onRequestSource}
          onDisconnect={async () => ({ status: "applied" })}
          onOpen={() => {}}
          onPreviewMarkdown={onPreviewMarkdown}
          onCreateConvertedMdx={onCreateConvertedMdx}
        />
      </TooltipProvider>
    );
  });

  await act(async () => {
    findButton("Convert Markdown").click();
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve())
    );
  });
  const markdownOption = Array.from(
    document.body.querySelectorAll<HTMLElement>('[role="option"]')
  ).find((option) => option.textContent?.includes("legacy.md"));
  expect(markdownOption).toBeDefined();
  expect(
    Array.from(
      document.body.querySelectorAll<HTMLElement>('[role="option"]')
    ).some((option) => option.textContent?.includes("other.mdx"))
  ).toBe(false);
  const markdownPreview = markdownOption?.querySelector<HTMLElement>(
    "[data-asset-thumbnail] > div"
  );
  if (markdownPreview === undefined || markdownPreview === null) {
    throw new Error("Expected Markdown Asset preview");
  }
  await act(async () => {
    markdownPreview.click();
    await Promise.resolve();
  });

  expect(document.body.textContent).toContain(
    "1 unsupported part will be skipped"
  );
  expect(document.body.textContent).toContain("html: Unsupported HTML");
  expect(document.querySelector<HTMLTextAreaElement>("textarea")?.value).toBe(
    preview.source
  );

  const conversionDialog = Array.from(
    document.body.querySelectorAll<HTMLElement>('[role="dialog"]')
  ).find((dialog) => dialog.textContent?.includes("Convert Markdown to MDX"));
  const createConverted = Array.from(
    conversionDialog?.querySelectorAll<HTMLButtonElement>("button") ?? []
  ).find((button) => button.textContent?.trim() === "Create MDX file");
  if (createConverted === undefined) {
    throw new Error("Expected conversion action");
  }
  await act(async () => {
    createConverted.click();
    await Promise.resolve();
  });
  expect(onCreateConvertedMdx).toHaveBeenCalledWith({
    assetId: "legacy",
    preview,
  });
  expect(onRequestSource).toHaveBeenCalledWith({
    source: { type: "asset", assetId: "converted" },
    confirmed: undefined,
  });
});
