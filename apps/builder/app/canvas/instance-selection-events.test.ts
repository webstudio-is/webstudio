import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { idAttribute, selectorIdAttribute } from "@webstudio-is/react-sdk";
import {
  $allSelectedInstanceSelectors,
  $textEditingInstanceSelector,
  selectInstances,
} from "~/shared/nano-states";
import { $instances } from "~/shared/sync/data-stores";
import { subscribeInstanceSelection } from "./instance-selection-events";
import { $ephemeralStyles } from "./stores";

const createElement = (selector: string) => {
  const element = document.createElement("div");
  const [id] = selector.split(",");
  element.setAttribute(idAttribute, id);
  element.setAttribute(selectorIdAttribute, selector);
  document.body.appendChild(element);
  return element;
};

let abortController: AbortController;

beforeEach(() => {
  document.body.innerHTML = "";
  selectInstances([]);
  $instances.set(new Map());
  $textEditingInstanceSelector.set(undefined);
  $ephemeralStyles.set([]);
  $instances.set(new Map());
  $textEditingInstanceSelector.set(undefined);
  abortController = new AbortController();
  subscribeInstanceSelection({ signal: abortController.signal });
});

afterEach(() => {
  abortController.abort();
  $ephemeralStyles.set([]);
});

describe("canvas instance selection", () => {
  test("plain click selects one instance and replaces multi-selection", () => {
    const box = createElement("box,body");
    const heading = createElement("heading,body");

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
    const box = createElement("box,body");
    const heading = createElement("heading,body");

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
    const box = createElement("box,body");
    createElement("heading,body");
    const footer = createElement("footer,body");

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
    const box = createElement("box,body");
    createElement("heading,body");
    const footer = createElement("footer,body");

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
    const box = createElement("box,body");
    const heading = createElement("heading,body");
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

  test("double click selects the owning instance without editing a mixed child sequence", () => {
    $instances.set(
      new Map([
        [
          "reading-time",
          {
            type: "instance",
            id: "reading-time",
            component: "ws:element",
            tag: "span",
            children: [
              { type: "text", value: " · " },
              { type: "expression", value: 'readTime ?? ""' },
            ],
          },
        ],
        [
          "paragraph",
          {
            type: "instance",
            id: "paragraph",
            component: "ws:element",
            tag: "p",
            children: [
              { type: "text", value: "" },
              { type: "id", value: "reading-time" },
            ],
          },
        ],
        [
          "body",
          {
            type: "instance",
            id: "body",
            component: "Body",
            children: [{ type: "id", value: "paragraph" }],
          },
        ],
      ])
    );
    const readingTime = createElement("reading-time,paragraph,body");

    readingTime.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));

    expect($allSelectedInstanceSelectors.get()).toEqual([
      ["reading-time", "paragraph", "body"],
    ]);
    expect($textEditingInstanceSelector.get()).toBeUndefined();
  });
});
