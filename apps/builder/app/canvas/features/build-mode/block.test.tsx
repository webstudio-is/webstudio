/**
 * @vitest-environment jsdom
 */
import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test } from "vitest";
import { blockComponent, blockTemplateComponent } from "@webstudio-is/sdk";
import {
  resetMaterializedContent,
  type ContentBlockPresentationItem,
} from "~/shared/content-block-content";
import { $instances, $props, resetDataStores } from "~/shared/sync/data-stores";
import { $builderMode } from "~/shared/nano-states";
import { Block, ContentBlockPresentation } from "./block";
import {
  componentAttribute,
  idAttribute,
  selectorIdAttribute,
} from "@webstudio-is/react-sdk";
import { rawTheme } from "@webstudio-is/design-system";

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
  resetDataStores();
  $builderMode.set("design");
});

const item: ContentBlockPresentationItem = {
  id: "notice",
  blockInstanceId: "block",
  renderScope: "scope:item-1",
  label: "Missing template: Hero",
  message: "Template Hero is unavailable.",
};

const systemProps = {
  [componentAttribute]: "ws:content-presentation",
  [idAttribute]: "notice",
  [selectorIdAttribute]: "notice,block",
};

test("keeps a connected empty Content Block selectable without an empty-state message", () => {
  $builderMode.set("content");
  $instances.set(
    new Map([
      [
        "block",
        {
          type: "instance" as const,
          id: "block",
          component: blockComponent,
          children: [{ type: "id" as const, value: "templates" }],
        },
      ],
      [
        "templates",
        {
          type: "instance" as const,
          id: "templates",
          component: blockTemplateComponent,
          children: [],
        },
      ],
    ])
  );
  $props.set(
    new Map([
      [
        "source",
        {
          id: "source",
          instanceId: "block",
          name: "src",
          type: "asset" as const,
          value: "article",
        },
      ],
    ])
  );

  act(() => {
    root.render(
      <Block
        {...{
          [componentAttribute]: blockComponent,
          [idAttribute]: "block",
          [selectorIdAttribute]: "block,body",
        }}
      >
        <div />
      </Block>
    );
  });

  const block = container.querySelector<HTMLElement>('[data-ws-id="block"]');
  expect(block).not.toBeNull();
  expect(block?.style.minHeight).toBe(rawTheme.spacing[9]);
  expect(container.textContent).toBe("");

  act(() => $builderMode.set("preview"));
  expect(container.querySelector('[data-ws-id="block"]')).toBeNull();
});

test("renders an accessible selectable unresolved-template warning without file controls", () => {
  act(() => {
    root.render(<ContentBlockPresentation item={item} {...systemProps} />);
  });

  const notice = container.querySelector<HTMLElement>('[role="status"]');
  expect(notice?.tabIndex).toBe(0);
  expect(notice?.textContent).toContain("Missing template: Hero");
  expect(notice?.getAttribute("aria-live")).toBe("off");
  expect(container.querySelector("button")).toBeNull();
  expect(container.textContent).not.toContain("Open file");
});
