import { Fragment, type JSX, type ReactNode } from "react";
import { encodeDataSourceVariable, getStyleDeclKey } from "@webstudio-is/sdk";
import type {
  Breakpoint,
  DataSource,
  Instance,
  Prop,
  StyleDecl,
  StyleSource,
  StyleSourceSelection,
  WebstudioData,
  WebstudioFragment,
} from "@webstudio-is/sdk";
import { showAttribute } from "@webstudio-is/react-sdk";
import type { TemplateStyleDecl } from "./css";

export class Variable {
  name: string;
  initialValue: unknown;
  constructor(name: string, initialValue: unknown) {
    this.name = name;
    this.initialValue = initialValue;
  }
}

export class Parameter {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
}

class Expression {
  chunks: string[];
  variables: Array<Variable | Parameter>;
  constructor(chunks: string[], variables: Array<Variable | Parameter>) {
    this.chunks = chunks;
    this.variables = variables;
  }
  serialize(variableIds: string[]): string {
    const values = variableIds.map(encodeDataSourceVariable);
    return String.raw({ raw: this.chunks }, ...values);
  }
}

export const expression = (
  chunks: TemplateStringsArray,
  ...variables: Array<Variable | Parameter>
): Expression => {
  return new Expression(Array.from(chunks), variables);
};

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
  args: string[];
  expression: Expression;
  constructor(args: string[], code: string | Expression) {
    this.args = args;
    if (typeof code === "string") {
      this.expression = new Expression([code], []);
    } else {
      this.expression = code;
    }
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

export class PlaceholderValue {
  value: string;
  constructor(text: string) {
    this.value = text;
  }
}

const isChildValue = (child: unknown) =>
  typeof child === "string" ||
  child instanceof PlaceholderValue ||
  child instanceof ExpressionValue ||
  child instanceof Expression;

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
      if (isChildValue(child)) {
        continue;
      }
      result.push(...traverseJsx(child, callback));
    }
    return result;
  }
  const child = callback(element, children);
  result.push(child);
  for (const child of children) {
    if (isChildValue(child)) {
      continue;
    }
    traverseJsx(child, callback);
  }
  return result;
};

export const renderTemplate = (root: JSX.Element): WebstudioFragment => {
  let lastId = -1;
  const instances: Instance[] = [];
  const props: Prop[] = [];
  const breakpoints: Breakpoint[] = [];
  const styleSources: StyleSource[] = [];
  const styleSourceSelections: StyleSourceSelection[] = [];
  const styles: StyleDecl[] = [];
  const dataSources = new Map<Variable | Parameter, DataSource>();
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
  const getVariableId = (
    instanceId: string,
    variable: Variable | Parameter
  ) => {
    const id = getId(variable);
    if (dataSources.has(variable)) {
      return id;
    }
    if (variable instanceof Variable) {
      let value: Extract<DataSource, { type: "variable" }>["value"];
      if (typeof variable.initialValue === "string") {
        value = { type: "string", value: variable.initialValue };
      } else if (typeof variable.initialValue === "number") {
        value = { type: "number", value: variable.initialValue };
      } else if (typeof variable.initialValue === "boolean") {
        value = { type: "boolean", value: variable.initialValue };
      } else {
        value = { type: "json", value: variable.initialValue };
      }
      dataSources.set(variable, {
        type: "variable",
        scopeInstanceId: instanceId,
        id,
        name: variable.name,
        value,
      });
    }
    if (variable instanceof Parameter) {
      dataSources.set(variable, {
        type: "parameter",
        scopeInstanceId: instanceId,
        id,
        name: variable.name,
      });
    }
    return id;
  };
  // lazily create breakpoint
  const getBreakpointId = () => {
    if (breakpoints.length > 0) {
      return breakpoints[0].id;
    }
    const breakpointId = "base";
    breakpoints.push({
      id: breakpointId,
      label: "",
    });
    return breakpointId;
  };
  const children = traverseJsx(root, (element, children) => {
    const instanceId = element.props?.["ws:id"] ?? getId(element);
    for (const entry of Object.entries({ ...element.props })) {
      const [_name, value] = entry;
      let [name] = entry;
      if (name === "ws:id" || name === "ws:label" || name === "children") {
        continue;
      }
      if (name === "ws:style") {
        const styleSourceId = `${instanceId}:${name}`;
        styleSources.push({
          type: "local",
          id: styleSourceId,
        });
        styleSourceSelections.push({
          instanceId,
          values: [styleSourceId],
        });
        const localStyles = value as TemplateStyleDecl[];
        for (const styleDecl of localStyles) {
          styles.push({
            breakpointId: getBreakpointId(),
            styleSourceId,
            ...styleDecl,
          });
        }
        continue;
      }
      if (name === "ws:show") {
        name = showAttribute;
      }
      const propId = `${instanceId}:${name}`;
      const base = { id: propId, instanceId, name };
      if (value instanceof Expression) {
        const values = value.variables.map((variable) =>
          getVariableId(instanceId, variable)
        );
        const expression = value.serialize(values);
        props.push({ ...base, type: "expression", value: expression });
        continue;
      }
      if (value instanceof Parameter) {
        props.push({
          ...base,
          type: "parameter",
          value: getVariableId(instanceId, value),
        });
        continue;
      }
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
        const code = value.expression.serialize(
          value.expression.variables.map((variable) =>
            getVariableId(instanceId, variable)
          )
        );
        const action = { type: "execute" as const, args: value.args, code };
        props.push({ ...base, type: "action", value: [action] });
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
      children: children.map((child): Instance["children"][number] => {
        if (typeof child === "string") {
          return { type: "text", value: child };
        }
        if (child instanceof PlaceholderValue) {
          return { type: "text", value: child.value, placeholder: true };
        }
        if (child instanceof Expression) {
          const values = child.variables.map((variable) =>
            getVariableId(instanceId, variable)
          );
          const expression = child.serialize(values);
          return { type: "expression", value: expression };
        }
        if (child instanceof ExpressionValue) {
          return { type: "expression", value: child.value };
        }
        return { type: "id", value: child.props?.["ws:id"] ?? getId(child) };
      }),
    };
    instances.push(instance);
    return { type: "id", value: instance.id };
  });
  return {
    children,
    instances,
    props,
    breakpoints,
    styleSources,
    styleSourceSelections,
    styles,
    dataSources: Array.from(dataSources.values()),
    resources: [],
    assets: [],
  };
};

export const renderData = (root: JSX.Element): Omit<WebstudioData, "pages"> => {
  const {
    instances,
    props,
    breakpoints,
    styleSources,
    styleSourceSelections,
    styles,
    dataSources,
    resources,
    assets,
  } = renderTemplate(root);
  return {
    instances: new Map(instances.map((item) => [item.id, item])),
    props: new Map(props.map((item) => [item.id, item])),
    breakpoints: new Map(breakpoints.map((item) => [item.id, item])),
    styleSources: new Map(styleSources.map((item) => [item.id, item])),
    styleSourceSelections: new Map(
      styleSourceSelections.map((item) => [item.instanceId, item])
    ),
    styles: new Map(styles.map((item) => [getStyleDeclKey(item), item])),
    dataSources: new Map(dataSources.map((item) => [item.id, item])),
    resources: new Map(resources.map((item) => [item.id, item])),
    assets: new Map(assets.map((item) => [item.id, item])),
  };
};

type ComponentProps = Record<string, unknown> &
  Record<`${string}:expression`, string> & {
    "ws:id"?: string;
    "ws:label"?: string;
    "ws:style"?: TemplateStyleDecl[];
    "ws:show"?: boolean | Expression;
    children?: ReactNode | ExpressionValue | Expression | PlaceholderValue;
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
