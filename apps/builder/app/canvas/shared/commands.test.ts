import { afterEach, describe, expect, test } from "vitest";
import { idAttribute, selectorIdAttribute } from "@webstudio-is/react-sdk";
import {
  $allSelectedInstanceSelectors,
  $selectedInstanceSelector,
  $textEditingInstanceSelector,
  $textToolbar,
  selectInstance,
  selectInstances,
} from "~/shared/nano-states";
import { $instances } from "~/shared/sync/data-stores";
import { emitCommand } from "./commands";

afterEach(() => {
  document.body.innerHTML = "";
  $instances.set(new Map());
  selectInstance(undefined);
  $textEditingInstanceSelector.set(undefined);
  $textToolbar.set(undefined);
});

test("does not enter text editing for a rich-text tree with a nested binding", () => {
  $instances.set(
    new Map([
      [
        "separator",
        {
          type: "instance" as const,
          id: "separator",
          component: "ws:element",
          tag: "span",
          children: [{ type: "text" as const, value: " · " }],
        },
      ],
      [
        "reading-time",
        {
          type: "instance" as const,
          id: "reading-time",
          component: "ws:element",
          tag: "span",
          children: [
            { type: "text" as const, value: " · " },
            { type: "expression" as const, value: 'readTime ?? ""' },
          ],
        },
      ],
      [
        "paragraph",
        {
          type: "instance" as const,
          id: "paragraph",
          component: "ws:element",
          tag: "p",
          children: [
            { type: "text" as const, value: "" },
            { type: "id" as const, value: "separator" },
            { type: "id" as const, value: "reading-time" },
          ],
        },
      ],
    ])
  );
  const element = document.createElement("span");
  element.setAttribute(idAttribute, "separator");
  element.setAttribute(selectorIdAttribute, "separator,paragraph");
  document.body.appendChild(element);
  selectInstance(["separator", "paragraph"]);

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
