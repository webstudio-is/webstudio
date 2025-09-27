import { Fragment, type JSX, type ReactNode } from "react";
import { encodeDataSourceVariable, getStyleDeclKey } from "@webstudio-is/sdk";
import type {
  Breakpoint,
  DataSource,
  Instance,
  Prop,
  Resource,
  StyleDecl,
  StyleSource,
  StyleSourceSelection,
  WebstudioData,
  WebstudioFragment,
} from "@webstudio-is/sdk";
import { showAttribute } from "@webstudio-is/react-sdk";
import type { TemplateStyleDecl } from "./css";
import { camelCaseProperty, parseMediaQuery } from "@webstudio-is/css-data";

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

type ResourceConfig = {
  url: Expression;
  method: Resource["method"];
  searchParams: Array<{ name: string; value: Expression }>;
  headers: Array<{ name: string; value: Expression }>;
  body?: Expression;
};

export class ResourceValue {
  name: string;
  config: ResourceConfig;
  constructor(name: string, config: ResourceConfig) {
    this.name = name;
    this.config = config;
  }
}

class Expression {
  chunks: string[];
  variables: Array<Variable | Parameter | ResourceValue>;
  constructor(
    chunks: string[],
    variables: Array<Variable | Parameter | ResourceValue>
  ) {
    this.chunks = chunks;
    this.variables = variables;
  }
}

export const expression = (
  chunks: TemplateStringsArray,
  ...variables: Array<Variable | Parameter>
): Expression => {
  return new Expression(Array.from(chunks), variables);
};

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
  child instanceof Expression;

const getElementChildren = (element: JSX.Element): JSX.Element[] => {
  if (Array.isArray(element.props?.children)) {
    return element.props?.children;
  }
  if (element.props?.children) {
    return [element.props?.children];
  }
  return [];
};

export const renderTemplate = (
  root: JSX.Element,
  generateId?: () => string,
  initialBreakpoints: Breakpoint[] = []
): WebstudioFragment => {
  const instances: Instance[] = [];
  const props: Prop[] = [];
  const breakpoints = Array.from(initialBreakpoints);
  const styleSources: StyleSource[] = [];
  const styleSourceSelections: StyleSourceSelection[] = [];
  const styles: StyleDecl[] = [];
  const dataSources = new Map<Variable | Parameter, DataSource>();
  const resources = new Map<ResourceValue, Resource>();
  const idsByKey = new Map<unknown, string>();
  const lastIdsByList = new Map<unknown, number>();
  // ensure ids are stable for specific list
  const getIdForList = (list: unknown) => {
    if (generateId) {
      return generateId();
    }
    let lastId = lastIdsByList.get(list) ?? -1;
    lastId += 1;
    lastIdsByList.set(list, lastId);
    return lastId.toString();
  };
  const getIdByKey = (key: unknown) => {
    let id = idsByKey.get(key);
    if (id === undefined) {
      id = getIdForList(idsByKey);
      idsByKey.set(key, id);
    }
    return id;
  };
  const getVariableId = (
    instanceId: string,
    variable: Variable | Parameter
  ) => {
    const id = getIdByKey(variable);
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
    if (variable instanceof ResourceValue) {
      dataSources.set(variable, {
        type: "resource",
        scopeInstanceId: instanceId,
        id,
        name: variable.name,
        resourceId: getResourceId(instanceId, variable),
      });
    }
    return id;
  };
  const compileExpression = (instanceId: string, expression: Expression) => {
    const values = expression.variables.map((variable) =>
      getVariableId(instanceId, variable)
    );
    return String.raw(
      { raw: expression.chunks },
      ...values.map(encodeDataSourceVariable)
    );
  };
  const getResourceId = (instanceId: string, resourceValue: ResourceValue) => {
    const id = `resource:${getIdByKey(resourceValue)}`;
    if (resources.has(resourceValue)) {
      return id;
    }
    resources.set(resourceValue, {
      id,
      name: resourceValue.name,
      url: compileExpression(instanceId, resourceValue.config.url),
      method: resourceValue.config.method,
      searchParams: resourceValue.config.searchParams.map(
        ({ name, value }) => ({
          name,
          value: compileExpression(instanceId, value),
        })
      ),
      headers: resourceValue.config.headers.map(({ name, value }) => ({
        name,
        value: compileExpression(instanceId, value),
      })),
      body: resourceValue.config.body
        ? compileExpression(instanceId, resourceValue.config.body)
        : undefined,
    });
    return id;
  };
  // lazily create breakpoint
  const getBreakpointId = (mediaQuery: undefined | string) => {
    if (mediaQuery === undefined) {
      let baseBreakpoint = breakpoints.find(
        (item) => item.minWidth === undefined && item.maxWidth === undefined
      );
      if (baseBreakpoint === undefined) {
        baseBreakpoint = { id: "base", label: "" };
        breakpoints.push(baseBreakpoint);
      }
      return baseBreakpoint.id;
    }
    const parsedMediaQuery = parseMediaQuery(mediaQuery);
    if (parsedMediaQuery === undefined) {
      return;
    }
    let breakpoint = breakpoints.find(
      (item) =>
        item.minWidth === parsedMediaQuery.minWidth &&
        item.maxWidth === parsedMediaQuery.maxWidth
    );
    if (breakpoint === undefined) {
      const id = getIdForList(breakpoints);
      const label = `${parsedMediaQuery.minWidth ?? parsedMediaQuery.maxWidth}`;
      breakpoint = { id, label, ...parsedMediaQuery };
      breakpoints.push(breakpoint);
    }
    return breakpoint.id;
  };
  const localStylesByInstanceId = new Map<
    Instance["id"],
    TemplateStyleDecl[]
  >();
  const convertElementToInstance = (
    element: JSX.Element
  ): Instance["children"][number] => {
    const instanceId = element.props?.["ws:id"] ?? getIdByKey(element);
    let tag: string | undefined;
    for (const entry of Object.entries({ ...element.props })) {
      const [_name, value] = entry;
      let [name] = entry;
      if (name === "ws:id" || name === "ws:label" || name === "children") {
        continue;
      }
      if (name === "ws:tag") {
        tag = value as string;
        continue;
      }
      if (name === "ws:style") {
        const localStyles = value as TemplateStyleDecl[];
        // create styles with breakpoints later to ensure more stable ids
        localStylesByInstanceId.set(instanceId, localStyles);
        continue;
      }
      if (name === "ws:show") {
        name = showAttribute;
      }
      const propId = `${instanceId}:${name}`;
      const base = { id: propId, instanceId, name };
      if (value instanceof Expression) {
        props.push({
          ...base,
          type: "expression",
          value: compileExpression(instanceId, value),
        });
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
      if (value instanceof ResourceValue) {
        const resourceId = getResourceId(instanceId, value);
        props.push({ ...base, type: "resource", value: resourceId });
        continue;
      }
      if (value instanceof ActionValue) {
        const code = compileExpression(instanceId, value.expression);
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
      children: [],
    };
    instances.push(instance);
    if (element.props?.["ws:label"]) {
      instance.label = element.props?.["ws:label"];
    }
    if (tag) {
      instance.tag = tag;
    }
    instance.children = getElementChildren(element).map(
      (child): Instance["children"][number] => {
        if (typeof child === "string") {
          return { type: "text", value: child };
        }
        if (child instanceof PlaceholderValue) {
          return { type: "text", value: child.value, placeholder: true };
        }
        if (child instanceof Expression) {
          const expression = compileExpression(instanceId, child);
          return { type: "expression", value: expression };
        }
        return convertElementToInstance(child);
      }
    );
    return { type: "id", value: instance.id };
  };
  const children: Instance["children"] = [];
  if (root.type === Fragment) {
    for (const child of getElementChildren(root)) {
      if (isChildValue(child)) {
        continue;
      }
      children.push(convertElementToInstance(child));
    }
  } else {
    children.push(convertElementToInstance(root));
  }
  for (const [instanceId, localStyles] of localStylesByInstanceId) {
    const styleSourceId = `${instanceId}:ws:style`;
    styleSources.push({
      type: "local",
      id: styleSourceId,
    });
    styleSourceSelections.push({
      instanceId,
      values: [styleSourceId],
    });
    for (const { breakpoint, state, property, value } of localStyles) {
      const breakpointId = getBreakpointId(breakpoint);
      if (breakpointId === undefined) {
        continue;
      }
      styles.push({
        breakpointId,
        styleSourceId,
        state,
        property: camelCaseProperty(property),
        value,
      });
    }
  }
  return {
    children,
    instances,
    props,
    breakpoints,
    styleSources,
    styleSourceSelections,
    styles,
    dataSources: Array.from(dataSources.values()),
    resources: Array.from(resources.values()),
    assets: [],
  };
};

export const renderData = (
  root: JSX.Element,
  generateId?: () => string,
  initialBreakpoints: Breakpoint[] = []
): Omit<WebstudioData, "pages"> => {
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
  } = renderTemplate(root, generateId, initialBreakpoints);
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
    "ws:tag"?: string;
    "ws:style"?: TemplateStyleDecl[];
    "ws:show"?: boolean | Expression;
    children?: ReactNode | Expression | PlaceholderValue;
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
