import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { getTagStyleId, type StyleDecl } from "@webstudio-is/sdk";
import { idAttribute, selectorIdAttribute } from "@webstudio-is/react-sdk";
import {
  $allSelectedInstanceSelectors,
  $selectedInstanceOutline,
  $selectedInstanceOutlines,
  $selectedInstanceStates,
  selectInstances,
} from "~/shared/nano-states";
import {
  $instances,
  $styleSourceSelections,
  $styles,
} from "~/shared/sync/data-stores";
import { subscribeSelected } from "./selected-instance-effects";
import { subscribeInstanceSelection } from "./instance-selection-events";
import { createCanvasElement } from "./test-utils";

const createInstance = (id: string) => ({
  type: "instance" as const,
  id,
  component: "Box",
  children: [],
});

class ResizeObserver {
  observe() {}
  disconnect() {}
}

class TestDOMRect {
  left: number;
  top: number;
  width: number;
  height: number;
  x: number;
  y: number;
  right: number;
  bottom: number;

  constructor(x = 0, y = 0, width = 0, height = 0) {
    this.left = x;
    this.top = y;
    this.width = width;
    this.height = height;
    this.x = x;
    this.y = y;
    this.right = x + width;
    this.bottom = y + height;
  }

  static fromRect(rect: Partial<globalThis.DOMRectReadOnly>) {
    return new TestDOMRect(rect.x, rect.y, rect.width, rect.height);
  }

  toJSON() {
    return this;
  }
}

class TestDOMMatrix {
  inverse() {
    return this;
  }
}

class TestDOMPoint {
  x: number;
  y: number;

  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  matrixTransform() {
    return this;
  }
}

let unsubscribe = () => {};
let abortController: AbortController;

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserver);
  vi.stubGlobal("DOMRect", TestDOMRect);
  vi.stubGlobal("DOMMatrix", TestDOMMatrix);
  vi.stubGlobal("DOMPoint", TestDOMPoint);
  vi.stubGlobal("requestAnimationFrame", () => 0);
  $instances.set(
    new Map([
      ["box", createInstance("box")],
      ["heading", createInstance("heading")],
    ])
  );
  $styleSourceSelections.set(new Map());
  $styles.set(new Map());
  $allSelectedInstanceSelectors.set([]);
  $selectedInstanceStates.set(new Set());
  $selectedInstanceOutline.set(undefined);
  $selectedInstanceOutlines.set([]);
  document.body.innerHTML = "";
  abortController = new AbortController();
});

afterEach(() => {
  abortController.abort();
  unsubscribe();
  unsubscribe = () => {};
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
  $instances.set(new Map());
  $styles.set(new Map());
  $styleSourceSelections.set(new Map());
  $allSelectedInstanceSelectors.set([]);
  $selectedInstanceStates.set(new Set());
  $selectedInstanceOutline.set(undefined);
  $selectedInstanceOutlines.set([]);
});

describe("subscribeSelected", () => {
  test("detects active states defined only by the selected tag style", () => {
    const button = document.createElement("button");
    button.disabled = true;
    button.setAttribute(idAttribute, "box");
    button.setAttribute(selectorIdAttribute, "box");
    document.body.appendChild(button);
    $instances.set(
      new Map([["box", { ...createInstance("box"), tag: "button" }]])
    );
    const declaration: StyleDecl = {
      styleSourceId: getTagStyleId("button"),
      breakpointId: "base",
      state: ":disabled",
      property: "color",
      value: { type: "keyword", value: "red" },
    };
    $styles.set(new Map([["button-disabled", declaration]]));
    unsubscribe = subscribeSelected((callback) => callback());

    selectInstances([["box"]]);

    expect($selectedInstanceStates.get()).toEqual(new Set([":disabled"]));
  });

  test("does not treat a descendant selector as an active instance state", () => {
    const div = document.createElement("div");
    div.setAttribute(idAttribute, "box");
    div.setAttribute(selectorIdAttribute, "box");
    document.body.appendChild(div);
    $styleSourceSelections.set(
      new Map([["box", { instanceId: "box", values: ["token"] }]])
    );
    $styles.set(
      new Map([
        [
          "token-descendant",
          {
            styleSourceId: "token",
            breakpointId: "base",
            state: " div",
            property: "paddingTop",
            value: { type: "unit", value: 20, unit: "px" },
          },
        ],
      ])
    );
    unsubscribe = subscribeSelected((callback) => callback());

    selectInstances([["box"]]);

    expect($selectedInstanceStates.get()).toEqual(new Set());
  });

  test("creates both outline stores for one selected instance", () => {
    createCanvasElement({
      selector: "box,body",
      rect: { left: 10, top: 20, width: 100, height: 50 },
    });
    unsubscribe = subscribeSelected((callback) => callback());

    selectInstances([["box", "body"]]);

    expect($selectedInstanceOutlines.get()).toEqual([
      expect.objectContaining({
        selector: ["box", "body"],
        instanceId: "box",
      }),
    ]);
    expect(Object.keys($selectedInstanceOutlines.get()[0].rect)).toEqual([
      "top",
      "left",
      "width",
      "height",
    ]);
    expect($selectedInstanceOutline.get()).toEqual(
      expect.objectContaining({
        instanceId: "box",
      })
    );
  });

  test("creates an outline for every selected instance without single outline", () => {
    createCanvasElement({
      selector: "box,body",
      rect: { left: 10, top: 20, width: 100, height: 50 },
    });
    createCanvasElement({
      selector: "heading,body",
      rect: { left: 20, top: 40, width: 140, height: 70 },
    });
    unsubscribe = subscribeSelected((callback) => callback());

    selectInstances([
      ["box", "body"],
      ["heading", "body"],
    ]);

    expect(
      $selectedInstanceOutlines.get().map((outline) => outline.selector)
    ).toEqual([
      ["box", "body"],
      ["heading", "body"],
    ]);
    expect($selectedInstanceOutline.get()).toBeUndefined();
  });

  test("does not fall back to parent rect for zero-size multi-selected instances", () => {
    const parent = createCanvasElement({
      selector: "parent,body",
      rect: { left: 5, top: 10, width: 500, height: 300 },
    });
    createCanvasElement({
      selector: "box,parent,body",
      rect: { left: 0, top: 0, width: 0, height: 0 },
      parent,
    });
    createCanvasElement({
      selector: "heading,parent,body",
      rect: { left: 20, top: 40, width: 140, height: 70 },
      parent,
    });
    unsubscribe = subscribeSelected((callback) => callback());

    selectInstances([
      ["box", "parent", "body"],
      ["heading", "parent", "body"],
    ]);

    expect($selectedInstanceOutlines.get()[0]).toEqual(
      expect.objectContaining({
        selector: ["box", "parent", "body"],
        rect: expect.objectContaining({
          left: 0,
          top: 0,
          width: 0,
          height: 0,
        }),
      })
    );
    expect(
      $selectedInstanceOutlines
        .get()
        .some(
          (outline) => outline.rect.width === 500 && outline.rect.height === 300
        )
    ).toBe(false);
  });

  test("creates outlines when instances are selected by canvas clicks", () => {
    const box = createCanvasElement({
      selector: "box,body",
      rect: { left: 10, top: 20, width: 100, height: 50 },
    });
    const heading = createCanvasElement({
      selector: "heading,body",
      rect: { left: 20, top: 40, width: 140, height: 70 },
    });
    unsubscribe = subscribeSelected((callback) => callback());
    subscribeInstanceSelection({ signal: abortController.signal });

    box.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(
      $selectedInstanceOutlines.get().map((outline) => outline.selector)
    ).toEqual([["box", "body"]]);
    expect($selectedInstanceOutline.get()).toEqual(
      expect.objectContaining({
        instanceId: "box",
      })
    );

    heading.dispatchEvent(
      new MouseEvent("click", { bubbles: true, metaKey: true })
    );

    expect(
      $selectedInstanceOutlines.get().map((outline) => outline.selector)
    ).toEqual([
      ["box", "body"],
      ["heading", "body"],
    ]);
    expect($selectedInstanceOutline.get()).toBeUndefined();
  });
});
