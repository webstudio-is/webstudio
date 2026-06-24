import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import type { Instance } from "@webstudio-is/sdk";
import { $instances } from "~/shared/sync/data-stores";
import {
  $selectedInstanceOutlines,
  $textEditingInstanceSelector,
} from "~/shared/nano-states";
import {
  $canvasRect,
  $canvasScrollbarSize,
  $canvasWidth,
  $workspaceRect,
} from "~/builder/shared/nano-states";
import { $ephemeralStyles } from "~/canvas/stores";
import { SelectedInstanceOutline } from "./selected-instance-outline";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

const createInstance = (id: Instance["id"]): Instance => ({
  type: "instance",
  id,
  component: "Box",
  children: [],
});

const rect = (left: number, top: number, width: number, height: number) =>
  ({ left, top, width, height }) as DOMRect;

const renderSelectedInstanceOutline = () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(createElement(SelectedInstanceOutline));
  });
  return {
    getOutlines: () => document.querySelectorAll("[data-ws-outline]"),
  };
};

beforeEach(() => {
  $instances.set(
    new Map([
      ["box1", createInstance("box1")],
      ["box2", createInstance("box2")],
    ])
  );
  $workspaceRect.set(rect(0, 0, 1000, 800));
  $canvasRect.set(rect(0, 0, 1000, 800));
  $canvasScrollbarSize.set({ width: 0, height: 0 });
  $canvasWidth.set(1000);
  $ephemeralStyles.set([]);
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = undefined;
  document.body.innerHTML = "";
  $instances.set(new Map());
  $selectedInstanceOutlines.set([]);
  $textEditingInstanceSelector.set(undefined);
  $workspaceRect.set(undefined);
  $canvasRect.set(undefined);
  $canvasScrollbarSize.set(undefined);
  $canvasWidth.set(undefined);
  $ephemeralStyles.set([]);
});

describe("SelectedInstanceOutline", () => {
  test("renders an outline for every selected instance outline", () => {
    $selectedInstanceOutlines.set([
      {
        selector: ["box1", "body"],
        instanceId: "box1",
        rect: rect(10, 20, 100, 50),
      },
      {
        selector: ["box2", "body"],
        instanceId: "box2",
        rect: rect(40, 80, 120, 60),
      },
    ]);

    const { getOutlines } = renderSelectedInstanceOutline();

    expect(getOutlines()).toHaveLength(2);
  });

  test("renders multiple selected outlines when stale ephemeral styles exist", () => {
    $selectedInstanceOutlines.set([
      {
        selector: ["box1", "body"],
        instanceId: "box1",
        rect: rect(10, 20, 100, 50),
      },
      {
        selector: ["box2", "body"],
        instanceId: "box2",
        rect: rect(40, 80, 120, 60),
      },
    ]);
    $ephemeralStyles.set([
      {
        breakpointId: "base",
        styleSourceId: "style-source",
        property: "color",
        value: { type: "keyword", value: "red" },
      },
    ]);

    const { getOutlines } = renderSelectedInstanceOutline();

    expect(getOutlines()).toHaveLength(2);
  });

  test("hides only the outline for the instance being text edited", () => {
    $selectedInstanceOutlines.set([
      {
        selector: ["box1", "body"],
        instanceId: "box1",
        rect: rect(10, 20, 100, 50),
      },
      {
        selector: ["box2", "body"],
        instanceId: "box2",
        rect: rect(40, 80, 120, 60),
      },
    ]);
    $textEditingInstanceSelector.set({
      selector: ["box1", "body"],
      reason: "enter",
    });

    const { getOutlines } = renderSelectedInstanceOutline();

    expect(getOutlines()).toHaveLength(1);
  });
});
