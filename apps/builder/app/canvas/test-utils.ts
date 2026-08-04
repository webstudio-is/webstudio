import type { Instance, Instances } from "@webstudio-is/sdk";
import { idAttribute, selectorIdAttribute } from "@webstudio-is/react-sdk";

export const createCanvasElement = (selector: string) => {
  const element = document.createElement("div");
  const [id] = selector.split(",");
  element.setAttribute(idAttribute, id);
  element.setAttribute(selectorIdAttribute, selector);
  document.body.appendChild(element);
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

export const createMixedBoundTextInstances = ({
  includeBody = false,
}: { includeBody?: boolean } = {}): Instances => {
  const instances: Instance[] = [
    {
      type: "instance",
      id: "separator",
      component: "ws:element",
      tag: "span",
      children: [{ type: "text", value: " · " }],
    },
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
  ];
  if (includeBody) {
    instances.push({
      type: "instance",
      id: "body",
      component: "Body",
      children: [{ type: "id", value: "paragraph" }],
    });
  }
  return new Map(instances.map((instance) => [instance.id, instance]));
};
