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

test("enters the first literal descendant of a mixed rich-text tree", () => {
  $instances.set(createMixedBoundTextInstances());
  createCanvasElement({ selector: "separator,paragraph" });
  selectInstance(["paragraph"]);

  emitCommand("editInstanceText");

  expect($textEditingInstanceSelector.get()?.selector).toEqual([
    "separator",
    "paragraph",
  ]);
});

test("does not enter text editing for a directly bound instance", () => {
  $instances.set(createBoundTextInstances());
  createCanvasElement({ selector: "bound-text" });
  selectInstance(["bound-text"]);

  emitCommand("editInstanceText");

  expect($textEditingInstanceSelector.get()).toBeUndefined();
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
