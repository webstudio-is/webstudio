import type { Instances } from "@webstudio-is/sdk";
import { idAttribute, selectorIdAttribute } from "@webstudio-is/react-sdk";

export const createCanvasElement = ({
  selector,
  rect,
  parent = document.body,
}: {
  selector: string;
  rect?: { left: number; top: number; width: number; height: number };
  parent?: HTMLElement;
}) => {
  const element = document.createElement("div");
  const [id] = selector.split(",");
  element.setAttribute(idAttribute, id);
  element.setAttribute(selectorIdAttribute, selector);
  if (rect !== undefined) {
    element.getBoundingClientRect = () =>
      DOMRect.fromRect({
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      });
  }
  parent.appendChild(element);
  return element;
};

export const createBoundTextInstances = (): Instances =>
  new Map([
    [
      "bound-text",
      {
        type: "instance",
        id: "bound-text",
        component: "ws:element",
        tag: "span",
        children: [{ type: "expression", value: "value" }],
      },
    ],
  ]);

export const createMixedBoundTextInstances = (): Instances =>
  new Map([
    [
      "separator",
      {
        type: "instance",
        id: "separator",
        component: "ws:element",
        tag: "span",
        children: [{ type: "text", value: " · " }],
      },
    ],
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
          { type: "id", value: "separator" },
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
  ]);
