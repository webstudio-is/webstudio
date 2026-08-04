import { afterEach, describe, expect, test } from "vitest";
import {
  $allSelectedInstanceSelectors,
  $selectedInstanceSelector,
  $textEditingInstanceSelector,
  $textToolbar,
  selectInstance,
  selectInstances,
} from "~/shared/nano-states";
import { $instances } from "~/shared/sync/data-stores";
import {
  createBoundTextInstances,
  createCanvasElement,
  createMixedBoundTextInstances,
} from "../test-utils";
import { emitCommand } from "./commands";

afterEach(() => {
  document.body.innerHTML = "";
  $instances.set(new Map());
  selectInstance(undefined);
  $textEditingInstanceSelector.set(undefined);
  $textToolbar.set(undefined);
});

test("does not enter text editing for a rich-text tree with a nested binding", () => {
  $instances.set(createMixedBoundTextInstances());
  createCanvasElement("separator,paragraph");
  selectInstance(["separator", "paragraph"]);

  emitCommand("editInstanceText");

  expect($textEditingInstanceSelector.get()).toBeUndefined();
});

test("enters text editing for a directly bound instance in Design mode", () => {
  $instances.set(createBoundTextInstances());
  createCanvasElement("bound-text");
  selectInstance(["bound-text"]);

  emitCommand("editInstanceText");

  expect($textEditingInstanceSelector.get()?.selector).toEqual(["bound-text"]);
});

describe("escapeSelection", () => {
  test("closes text toolbar before exiting text editing or clearing selection", () => {
    selectInstance(["text", "body"]);
    $textEditingInstanceSelector.set({
      selector: ["text", "body"],
      reason: "enter",
    });
    $textToolbar.set({
      selectionRect: undefined,
      isBold: false,
      isItalic: false,
      isSuperscript: false,
      isSubscript: false,
      isLink: false,
      isSpan: false,
    });

    emitCommand("escapeSelection");

    expect($textToolbar.get()).toBeUndefined();
    expect($textEditingInstanceSelector.get()).toEqual({
      selector: ["text", "body"],
      reason: "enter",
    });
    expect($selectedInstanceSelector.get()).toEqual(["text", "body"]);
  });

  test("exits text editing before clearing selection", () => {
    selectInstance(["text", "body"]);
    $textEditingInstanceSelector.set({
      selector: ["text", "body"],
      reason: "enter",
    });

    emitCommand("escapeSelection");

    expect($textEditingInstanceSelector.get()).toBeUndefined();
    expect($selectedInstanceSelector.get()).toEqual(["text", "body"]);
  });

  test("clears selected instance when not editing text", () => {
    selectInstance(["box", "body"]);

    emitCommand("escapeSelection");

    expect($selectedInstanceSelector.get()).toBeUndefined();
  });

  test("clears multi-selection when not editing text", () => {
    selectInstances([
      ["box1", "body"],
      ["box2", "body"],
    ]);

    emitCommand("escapeSelection");

    expect($allSelectedInstanceSelectors.get()).toEqual([]);
    expect($selectedInstanceSelector.get()).toBeUndefined();
  });
});
