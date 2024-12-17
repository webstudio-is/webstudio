import { Fragment, type JSX, type ReactNode } from "react";
import type { Instance, Instances, Prop, Props } from "@webstudio-is/sdk";

export class ExpressionValue {
  value: string;
  constructor(expression: string) {
    this.value = expression;
  }
}

export class ParameterValue {
  value: string;
  constructor(dataSourceId: string) {
    this.value = dataSourceId;
  }
}

export class ResourceValue {
  value: string;
  constructor(resourceId: string) {
    this.value = resourceId;
  }
}

export class ActionValue {
  value: { type: "execute"; args: string[]; code: string };
  constructor(args: string[], code: string) {
    this.value = { type: "execute", args, code };
  }
}

export class AssetValue {
  value: string;
  constructor(assetId: string) {
    this.value = assetId;
  }
}

export class PageValue {
  value: string | { pageId: string; instanceId: string };
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
  callback: (
    element: JSX.Element,
    children: JSX.Element[]
  ) => Instance["children"][number]
) => {
  const children = Array.isArray(element.props?.children)
    ? element.props?.children
    : element.props?.children
      ? [element.props?.children]
      : [];
  const result: Instance["children"] = [];
  if (element.type === Fragment) {
    for (const child of children) {
      if (typeof child === "string") {
        continue;
      }
      if (child instanceof ExpressionValue) {
        continue;
      }
      result.push(...traverseJsx(child, callback));
    }
    return result;
  }
  const child = callback(element, children);
  result.push(child);
  for (const child of children) {
    if (typeof child === "string") {
      continue;
    }
    if (child instanceof ExpressionValue) {
      continue;
    }
    traverseJsx(child, callback);
  }
  return result;
};

type WebstudioTemplate = {
  children: Instance["children"];
  instances: Instance[];
  props: Prop[];
};

export const renderTemplate = (root: JSX.Element): WebstudioTemplate => {
  let lastId = -1;
  const instances: Instance[] = [];
  const props: Prop[] = [];
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
  const children = traverseJsx(root, (element, children) => {
    const instanceId = element.props?.["ws:id"] ?? getId(element);
    for (const [name, value] of Object.entries({ ...element.props })) {
      if (name === "ws:id" || name === "ws:label" || name === "children") {
        continue;
      }
      const propId = `${instanceId}:${name}`;
      const base = { id: propId, instanceId, name };
      if (value instanceof ExpressionValue) {
        props.push({ ...base, type: "expression", value: value.value });
        continue;
      }
      if (value instanceof ParameterValue) {
        props.push({ ...base, type: "parameter", value: value.value });
        continue;
      }
      if (value instanceof ResourceValue) {
        props.push({ ...base, type: "resource", value: value.value });
        continue;
      }
      if (value instanceof ActionValue) {
        props.push({ ...base, type: "action", value: [value.value] });
        continue;
      }
      if (value instanceof AssetValue) {
        props.push({ ...base, type: "asset", value: value.value });
        continue;
      }
      if (value instanceof PageValue) {
        props.push({ ...base, type: "page", value: value.value });
        continue;
      }
      if (typeof value === "string") {
        props.push({ ...base, type: "string", value });
        continue;
      }
      if (typeof value === "number") {
        props.push({ ...base, type: "number", value });
        continue;
      }
      if (typeof value === "boolean") {
        props.push({ ...base, type: "boolean", value });
        continue;
      }
      props.push({ ...base, type: "json", value });
    }
    const component = element.type.displayName;
    const instance: Instance = {
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
    };
    instances.push(instance);
    return { type: "id", value: instance.id };
  });
  return {
    children,
    instances,
    props,
  };
};

export const renderJsx = (
  root: JSX.Element
): {
  instances: Instances;
  props: Props;
} => {
  const fragment = renderTemplate(root);
  return {
    instances: new Map(
      fragment.instances.map((instance) => [instance.id, instance])
    ),
    props: new Map(fragment.props.map((prop) => [prop.id, prop])),
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

export const $: Record<string, Component> = createProxy("");

export const ws: Record<string, Component> = createProxy("ws:");
