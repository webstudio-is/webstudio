import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  $allSelectedInstanceSelectors,
  $textEditingInstanceSelector,
  selectInstances,
} from "~/shared/nano-states";
import { $instances } from "~/shared/sync/data-stores";
import { subscribeInstanceSelection } from "./instance-selection-events";
import { $ephemeralStyles } from "./stores";
import {
  createBoundTextInstances,
  createCanvasElement,
  createMixedBoundTextInstances,
} from "./test-utils";

let abortController: AbortController;

beforeEach(() => {
  document.body.innerHTML = "";
  selectInstances([]);
  $instances.set(new Map());
  $textEditingInstanceSelector.set(undefined);
  $ephemeralStyles.set([]);
  abortController = new AbortController();
  subscribeInstanceSelection({ signal: abortController.signal });
});

afterEach(() => {
  abortController.abort();
  $ephemeralStyles.set([]);
});

describe("canvas instance selection", () => {
  test("plain click selects one instance and replaces multi-selection", () => {
    const box = createCanvasElement("box,body");
    const heading = createCanvasElement("heading,body");

    box.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    heading.dispatchEvent(
      new MouseEvent("click", { bubbles: true, metaKey: true })
    );
    expect($allSelectedInstanceSelectors.get()).toEqual([
      ["box", "body"],
      ["heading", "body"],
    ]);

    heading.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect($allSelectedInstanceSelectors.get()).toEqual([["heading", "body"]]);
  });

  test("cmd-click toggles rendered instances without clearing existing selection", () => {
    const box = createCanvasElement("box,body");
    const heading = createCanvasElement("heading,body");

    box.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    heading.dispatchEvent(
      new MouseEvent("click", { bubbles: true, metaKey: true })
    );
    expect($allSelectedInstanceSelectors.get()).toEqual([
      ["box", "body"],
      ["heading", "body"],
    ]);

    box.dispatchEvent(
      new MouseEvent("click", { bubbles: true, metaKey: true })
    );

    expect($allSelectedInstanceSelectors.get()).toEqual([["heading", "body"]]);
  });

  test("shift-click selects a rendered DOM-order range from the canvas anchor", () => {
    const box = createCanvasElement("box,body");
    createCanvasElement("heading,body");
    const footer = createCanvasElement("footer,body");

    box.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    footer.dispatchEvent(
      new MouseEvent("click", { bubbles: true, shiftKey: true })
    );

    expect($allSelectedInstanceSelectors.get()).toEqual([
      ["box", "body"],
      ["heading", "body"],
      ["footer", "body"],
    ]);
  });

  test("does not reuse range anchor after subscription is recreated", () => {
    const box = createCanvasElement("box,body");
    createCanvasElement("heading,body");
    const footer = createCanvasElement("footer,body");

    box.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    abortController.abort();
    selectInstances([]);
    abortController = new AbortController();
    subscribeInstanceSelection({ signal: abortController.signal });

    footer.dispatchEvent(
      new MouseEvent("click", { bubbles: true, shiftKey: true })
    );

    expect($allSelectedInstanceSelectors.get()).toEqual([["footer", "body"]]);
  });

  test("clears stale ephemeral styles when canvas click creates multi-selection", () => {
    const box = createCanvasElement("box,body");
    const heading = createCanvasElement("heading,body");
    $ephemeralStyles.set([
      {
        breakpointId: "base",
        styleSourceId: "style-source",
        property: "color",
        value: { type: "keyword", value: "red" },
      },
    ]);

    box.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    heading.dispatchEvent(
      new MouseEvent("click", { bubbles: true, metaKey: true })
    );

    expect($ephemeralStyles.get()).toEqual([]);
  });

  test("does not edit a promoted rich-text root containing a nested binding", () => {
    $instances.set(createMixedBoundTextInstances({ includeBody: true }));
    const separator = createCanvasElement("separator,paragraph,body");

    separator.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));

    expect($allSelectedInstanceSelectors.get()).toEqual([
      ["separator", "paragraph", "body"],
    ]);
    expect($textEditingInstanceSelector.get()).toBeUndefined();
  });

  test("edits a directly bound text instance in Design mode", () => {
    $instances.set(createBoundTextInstances());
    const element = createCanvasElement("bound-text");

    element.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));

    expect($textEditingInstanceSelector.get()?.selector).toEqual([
      "bound-text",
    ]);
  });
});
