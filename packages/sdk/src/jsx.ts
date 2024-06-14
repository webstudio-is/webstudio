import type { ReactNode } from "react";
import type { Instances } from "./schema/instances";

const traverseJsx = (
  element: JSX.Element,
  callback: (element: JSX.Element, children: JSX.Element[]) => void
) => {
  const children = Array.isArray(element.props?.children)
    ? element.props?.children
    : element.props?.children
      ? [element.props?.children]
      : [];
  callback(element, children);
  for (const child of children) {
    traverseJsx(child, callback);
  }
};

export const renderJsx = (root: JSX.Element) => {
  let lastId = -1;
  const instances: Instances = new Map();
  const ids = new Map<unknown, string>();
  const getId = (key: unknown) => {
    let id = ids.get(key);
    if (id === undefined) {
      lastId += 1;
      id = lastId.toString();
      ids.set(key, id);
    }
    return id;
  };
  traverseJsx(root, (element, children) => {
    const id = element.props?.["ws:id"] ?? getId(element);
    const component = element.type.displayName;
    instances.set(id, {
      type: "instance",
      id,
      component,
      children: children.map((child) => ({
        type: "id",
        value: child.props?.["ws:id"] ?? getId(child),
      })),
    });
  });
  return {
    instances,
  };
};

type Props = {
  "ws:id"?: string;
  children?: ReactNode;
};

type Component = { displayName: string } & ((props: Props) => ReactNode);

export const $: Record<string, Component> = new Proxy(
  {},
  {
    get(_target, prop) {
      const component: Component = () => undefined;
      component.displayName = prop as string;
      return component;
    },
  }
);
