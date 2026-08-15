/**
 * @vitest-environment jsdom
 */
import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  registerContentBlockPresentationActions,
  resetMaterializedContent,
  type ContentBlockPresentationItem,
} from "~/shared/content-block-content";
import { ContentBlockPresentation } from "./block";
import {
  componentAttribute,
  idAttribute,
  selectorIdAttribute,
} from "@webstudio-is/react-sdk";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  resetMaterializedContent();
});

const item = (values: Partial<ContentBlockPresentationItem> = {}) => ({
  id: "notice",
  blockInstanceId: "block",
  renderScope: "scope:item-1",
  kind: "error" as const,
  status: "recoverable" as const,
  label: "Repair MDX file",
  message: "The MDX file could not be rendered.",
  assetId: "article",
  ...values,
});

const systemProps = {
  [componentAttribute]: "ws:content-presentation",
  [idAttribute]: "notice",
  [selectorIdAttribute]: "notice,block",
};

test("renders an accessible selectable recovery notice and retries its exact scope", async () => {
  const retry = vi.fn(async () => ({ status: "applied" as const }));
  registerContentBlockPresentationActions({
    blockInstanceId: "block",
    renderScope: "scope:item-1",
    actions: {
      retry,
      reloadRemote: async () => ({ status: "applied" }),
      copyUnsavedSource: () => undefined,
    },
  });
  act(() => {
    root.render(<ContentBlockPresentation item={item()} {...systemProps} />);
  });

  const notice = container.querySelector<HTMLElement>('[role="alert"]');
  expect(notice?.tabIndex).toBe(0);
  expect(notice?.textContent).toContain("Repair MDX file");
  const retryButton = container.querySelector<HTMLButtonElement>(
    '[aria-label="Retry loading MDX content"]'
  );
  await act(async () => retryButton?.click());
  expect(retry).toHaveBeenCalledOnce();
});

test("offers explicit conflict recovery without a blind retry", () => {
  const reloadRemote = vi.fn(async () => ({ status: "applied" as const }));
  registerContentBlockPresentationActions({
    blockInstanceId: "block",
    renderScope: "scope:item-1",
    actions: {
      retry: async () => ({ status: "applied" }),
      reloadRemote,
      copyUnsavedSource: () => "unsaved",
    },
  });
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn(async () => undefined) },
  });
  act(() => {
    root.render(
      <ContentBlockPresentation
        item={item({ status: "conflicting", label: "MDX conflict" })}
        {...systemProps}
      />
    );
  });

  expect(container.textContent).not.toContain("Retry");
  expect(container.textContent).toContain("Reload remote file");
  expect(container.textContent).toContain("Copy unsaved MDX");
});

test("announces unresolved templates as warnings without recovery controls", () => {
  act(() => {
    root.render(
      <ContentBlockPresentation
        item={item({
          kind: "warning",
          status: "ready",
          label: "Missing template: Hero",
          message: "Template Hero is unavailable.",
          assetId: undefined,
        })}
        {...systemProps}
      />
    );
  });

  const warning = container.querySelector('[role="status"]');
  expect(warning?.textContent).toContain("Missing template: Hero");
  expect(warning?.getAttribute("aria-live")).toBe("off");
  expect(container.querySelector("button")).toBeNull();
});

test.each([
  {
    kind: "loading" as const,
    status: "loading" as const,
    label: "Loading MDX",
    busy: "true",
  },
  {
    kind: "loading" as const,
    status: "pending" as const,
    label: "Saving MDX",
    busy: "true",
  },
  {
    kind: "empty" as const,
    status: "empty" as const,
    label: "Empty MDX file",
    busy: null,
  },
])("announces $status content without recovery controls", (state) => {
  act(() => {
    root.render(
      <ContentBlockPresentation
        item={item({ ...state, message: state.label, assetId: undefined })}
        {...systemProps}
      />
    );
  });

  const notice = container.querySelector('[role="status"]');
  expect(notice?.textContent).toContain(state.label);
  expect(notice?.getAttribute("aria-busy")).toBe(state.busy);
  expect(container.querySelector("button")).toBeNull();
});
