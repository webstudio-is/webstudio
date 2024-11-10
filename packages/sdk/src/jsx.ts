import type { ReactNode } from "react";
import type { Instances } from "./schema/instances";
import type { Props } from "./schema/props";

export class ExpressionValue {
  value;
  constructor(expression: string) {
    this.value = expression;
  }
}

export class ParameterValue {
  value;
  constructor(dataSourceID: string) {
    this.value = dataSourceID;
  }
}

export class ResourceValue {
  value;
  constructor(resourceId: string) {
    this.value = resourceId;
  }
}

export class ActionValue {
  value;
  constructor(args: string[], code: string) {
    this.value = { type: "execute" as const, args, code };
  }
}

export class AssetValue {
  value;
  constructor(assetId: string) {
    this.value = assetId;
  }
}

export class PageValue {
  value;
  constructor(pageId: string, instanceId?: string) {
    if (instanceId) {
      this.value = { pageId, instanceId };
    } else {
      this.value = pageId;
    }
  }
}

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
    if (typeof child === "string") {
      continue;
    }
    if (child instanceof ExpressionValue) {
      continue;
    }
    traverseJsx(child, callback);
  }
};

export const renderJsx = (root: JSX.Element) => {
  let lastId = -1;
  const instances: Instances = new Map();
  const props: Props = new Map();
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
    const instanceId = element.props?.["ws:id"] ?? getId(element);
    for (const [name, value] of Object.entries({ ...element.props })) {
      if (name === "ws:id" || name === "ws:label" || name === "children") {
        continue;
      }
      const propId = `${instanceId}:${name}`;
      const base = { id: propId, instanceId, name };
      if (value instanceof ExpressionValue) {
        props.set(propId, { ...base, type: "expression", value: value.value });
        continue;
      }
      if (value instanceof ParameterValue) {
        props.set(propId, { ...base, type: "parameter", value: value.value });
        continue;
      }
      if (value instanceof ResourceValue) {
        props.set(propId, { ...base, type: "resource", value: value.value });
        continue;
      }
      if (value instanceof ActionValue) {
        props.set(propId, { ...base, type: "action", value: [value.value] });
        continue;
      }
      if (value instanceof AssetValue) {
        props.set(propId, { ...base, type: "asset", value: value.value });
        continue;
      }
      if (value instanceof PageValue) {
        props.set(propId, { ...base, type: "page", value: value.value });
        continue;
      }
      if (typeof value === "string") {
        props.set(propId, { ...base, type: "string", value });
        continue;
      }
      if (typeof value === "number") {
        props.set(propId, { ...base, type: "number", value });
        continue;
      }
      if (typeof value === "boolean") {
        props.set(propId, { ...base, type: "boolean", value });
        continue;
      }
      props.set(propId, { ...base, type: "json", value });
    }
    const component = element.type.displayName;
    instances.set(instanceId, {
      type: "instance",
      id: instanceId,
      component,
      ...(element.props?.["ws:label"]
        ? { label: element.props?.["ws:label"] }
        : undefined),
      children: children.map((child) =>
        typeof child === "string"
          ? { type: "text", value: child }
          : child instanceof ExpressionValue
            ? { type: "expression", value: child.value }
            : { type: "id", value: child.props?.["ws:id"] ?? getId(child) }
      ),
    });
  });
  return {
    instances,
    props,
  };
};

type ComponentProps = Record<string, unknown> &
  Record<`${string}:expression`, string> & {
    "ws:id"?: string;
    "ws:label"?: string;
    children?: ReactNode | ExpressionValue;
  };

type Component = { displayName: string } & ((
  props: ComponentProps
) => ReactNode);

export const createProxy = (prefix: string): Record<string, Component> => {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        const component: Component = () => undefined;
        component.displayName = `${prefix}${prop as string}`;
        return component;
      },
    }
  );
};

export const $ = createProxy("");

export const ws = createProxy("ws:");
