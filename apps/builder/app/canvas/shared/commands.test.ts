import { afterEach, describe, expect, test } from "vitest";
import {
  $allSelectedInstanceSelectors,
  $selectedInstanceSelector,
  $textEditingInstanceSelector,
  $textToolbar,
  selectInstance,
  selectInstances,
} from "~/shared/nano-states";
import { emitCommand } from "./commands";

afterEach(() => {
  selectInstance(undefined);
  $textEditingInstanceSelector.set(undefined);
  $textToolbar.set(undefined);
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
