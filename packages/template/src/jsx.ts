import { Fragment, type JSX, type ReactNode } from "react";
import { hyphenateProperty } from "@webstudio-is/css-engine";
import {
  animationAction,
  encodeDataSourceVariable,
  getStyleDeclKey,
} from "@webstudio-is/sdk";
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
  WsComponentMeta,
} from "@webstudio-is/sdk";
import { showAttribute } from "@webstudio-is/react-sdk";
import { parseTemplateCss, type TemplateStyleDecl } from "./css";
import { camelCaseProperty, parseMediaQuery } from "@webstudio-is/css-data";

export class Token {
  name: string;
  styles: TemplateStyleDecl[];
  constructor(name: string, styles: TemplateStyleDecl[]) {
    this.name = name;
    this.styles = styles;
  }
}

export const token = (name: string, styles: TemplateStyleDecl[]): Token => {
  if (typeof name !== "string" || name.length === 0) {
    throw new Error(
      'token() requires a non-empty string name, for example token("brand", css`color: red;`).'
    );
  }
  if (Array.isArray(styles) === false) {
    throw new Error(
      'token() styles must come from css`...`, for example token("brand", css`color: red;`).'
    );
  }
  if (styles.length === 0) {
    throw new Error(
      'token() styles must include at least one valid CSS declaration from css`...`, for example token("brand", css`color: red;`).'
    );
  }
  return new Token(name, styles);
};

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
  control?: Resource["control"];
  url: Expression;
  method: Resource["method"];
  searchParams?: Array<{ name: string; value: Expression }>;
  headers?: Array<{ name: string; value: Expression }>;
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

const findUnsupportedSerializableValue = (
  value: unknown,
  path: string[] = [],
  ancestors = new WeakSet<object>()
):
  | {
      path: string[];
      message: string;
    }
  | undefined => {
  if (typeof value === "function") {
    return {
      path,
      message:
        "Do not pass JavaScript functions. Use Webstudio actions instead",
    };
  }
  if (value === undefined) {
    return {
      path,
      message: "Do not pass undefined. Omit the prop or use null instead",
    };
  }
  if (typeof value === "bigint") {
    return {
      path,
      message:
        "Do not pass BigInt values. Use a string, finite number, or expression instead",
    };
  }
  if (typeof value === "symbol") {
    return {
      path,
      message:
        "Do not pass Symbol values. Use a string, finite number, or expression instead",
    };
  }
  if (typeof value === "number" && Number.isFinite(value) === false) {
    return {
      path,
      message: "Do not pass NaN or Infinity. Use a finite number instead",
    };
  }
  if (typeof value !== "object" || value === null) {
    return;
  }
  if (Array.isArray(value)) {
    if (ancestors.has(value)) {
      return {
        path,
        message:
          "Do not pass circular objects. Use plain JSON-compatible values instead",
      };
    }
    ancestors.add(value);
    for (const [index, item] of value.entries()) {
      const unsupportedValue = findUnsupportedSerializableValue(
        item,
        [...path, String(index)],
        ancestors
      );
      if (unsupportedValue !== undefined) {
        return unsupportedValue;
      }
    }
    ancestors.delete(value);
    return;
  }
  const objectType = Object.prototype.toString.call(value);
  if (objectType !== "[object Object]") {
    return {
      path,
      message: `Do not pass ${objectType.slice(8, -1)} objects. Use plain JSON-compatible values instead`,
    };
  }
  const prototype = Object.getPrototypeOf(value);
  const constructorName =
    prototype === null
      ? "Object"
      : typeof prototype.constructor === "function"
        ? prototype.constructor.name
        : undefined;
  if (constructorName !== "Object") {
    return {
      path,
      message: `Do not pass ${constructorName ?? "custom"} objects. Use plain JSON-compatible values instead`,
    };
  }
  if (ancestors.has(value)) {
    return {
      path,
      message:
        "Do not pass circular objects. Use plain JSON-compatible values instead",
    };
  }
  ancestors.add(value);
  for (const [key, item] of Object.entries(value)) {
    const unsupportedValue = findUnsupportedSerializableValue(
      item,
      [...path, key],
      ancestors
    );
    if (unsupportedValue !== undefined) {
      return unsupportedValue;
    }
  }
  ancestors.delete(value);
};

const validateSerializablePropValue = (name: string, value: unknown) => {
  const unsupportedValue = findUnsupportedSerializableValue(value);
  if (unsupportedValue === undefined) {
    return;
  }
  const nestedPath =
    unsupportedValue.path.length === 0
      ? ""
      : ` at "${unsupportedValue.path.join(".")}"`;
  const actionHint = unsupportedValue.message.includes("functions")
    ? ` For actions, use ${name}={new ActionValue(["event"], expression\`console.log(event)\`)}.`
    : "";
  throw new Error(
    `Invalid JSX prop "${name}"${nestedPath}. ${unsupportedValue.message}.${actionHint}`
  );
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" &&
  value !== null &&
  Array.isArray(value) === false &&
  Object.prototype.toString.call(value) === "[object Object]";

const getReactStyleProperty = (name: string) =>
  name.startsWith("--") ? name : hyphenateProperty(name);

const parseReactStyleDeclaration = (property: string, value: string) =>
  parseTemplateCss(`${property}: ${value};`);

const hasInvalidStyleValue = (styles: TemplateStyleDecl[]) =>
  styles.some((style) => style.value.type === "invalid");

const convertReactStyleObject = (value: unknown): TemplateStyleDecl[] => {
  if (isPlainObject(value) === false) {
    throw new Error(
      "style prop must be a plain object, for example style={{ padding: 24 }}."
    );
  }
  const styles: TemplateStyleDecl[] = [];
  for (const [name, styleValue] of Object.entries(value)) {
    if (styleValue === undefined || styleValue === null) {
      continue;
    }
    const property = getReactStyleProperty(name);
    if (typeof styleValue === "number") {
      if (Number.isFinite(styleValue) === false) {
        throw new Error(
          `Invalid style prop "${name}". Use a finite number or string value.`
        );
      }
      const stringValue = String(styleValue);
      const parsedStyles = parseReactStyleDeclaration(property, stringValue);
      styles.push(
        ...((parsedStyles.length === 0 || hasInvalidStyleValue(parsedStyles)) &&
        styleValue !== 0
          ? parseReactStyleDeclaration(property, `${stringValue}px`)
          : parsedStyles)
      );
      continue;
    }
    if (typeof styleValue === "string") {
      styles.push(...parseReactStyleDeclaration(property, styleValue));
      continue;
    }
    throw new Error(
      `Invalid style prop "${name}". Use a string, finite number, null, or undefined value.`
    );
  }
  return styles;
};

export const renderTemplate = (
  root: JSX.Element,
  generateId?: () => string,
  initialBreakpoints: Breakpoint[] = [],
  options: {
    allowManualIds?: boolean;
    componentMetas?: Map<Instance["component"], WsComponentMeta>;
  } = {}
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
        value = { type: "json", value: variable.initialValue ?? null };
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
      control: resourceValue.config.control,
      url: compileExpression(instanceId, resourceValue.config.url),
      method: resourceValue.config.method,
      searchParams: resourceValue.config.searchParams?.map(
        ({ name, value }) => ({
          name,
          value: compileExpression(instanceId, value),
        })
      ),
      headers:
        resourceValue.config.headers?.map(({ name, value }) => ({
          name,
          value: compileExpression(instanceId, value),
        })) ?? [],
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
  const addLocalStyles = (
    instanceId: Instance["id"],
    localStyles: TemplateStyleDecl[]
  ) => {
    if (localStyles.length === 0) {
      return;
    }
    localStylesByInstanceId.set(instanceId, [
      ...(localStylesByInstanceId.get(instanceId) ?? []),
      ...localStyles,
    ]);
  };
  const tokensByInstanceId = new Map<Instance["id"], Token[]>();
  const tokenIdByToken = new Map<Token, string>();
  const getTokenId = (token: Token) => {
    let id = tokenIdByToken.get(token);
    if (id === undefined) {
      id = getIdByKey(token);
      tokenIdByToken.set(token, id);
    }
    return id;
  };
  const convertElementToInstance = (
    element: JSX.Element
  ): Instance["children"][number] => {
    if (element.type === Fragment) {
      throw new Error(
        "Do not use React fragment shorthand <>...</> inside Webstudio JSX. Pass sibling Webstudio components directly at the top level, or wrap text in a component such as <$.Box><$.Paragraph>Text</$.Paragraph></$.Box>."
      );
    }
    if (typeof element.type === "string") {
      throw new Error(
        `Do not use raw HTML tag <${element.type}> in Webstudio JSX. Use Webstudio components such as <$.Box>...</$.Box>, or use <ws.element ws:tag="${element.type}">...</ws.element> when a specific HTML tag is required.`
      );
    }
    if (
      options.allowManualIds === false &&
      element.props?.["ws:id"] !== undefined
    ) {
      throw new Error(
        "Do not set ws:id in JSX fragments. Webstudio runtime generates system ids automatically."
      );
    }
    const component = element.type.displayName;
    if (typeof component !== "string") {
      throw new Error(
        "Invalid JSX component in Webstudio JSX. Use Webstudio component helpers such as <$.Box>...</$.Box>."
      );
    }
    const instanceId = element.props?.["ws:id"] ?? getIdByKey(element);
    let tag: string | undefined;
    for (const entry of Object.entries({ ...element.props })) {
      const [_name, value] = entry;
      let [name] = entry;
      if (name === "ws:id" || name === "ws:label" || name === "children") {
        continue;
      }
      if (name === "className") {
        name = "class";
      }
      if (name === "htmlFor") {
        name = "for";
      }
      if (name === "ws:tag") {
        tag = value as string;
        continue;
      }
      if (name === "ws:style") {
        const localStyles = value as TemplateStyleDecl[];
        if (Array.isArray(localStyles) === false) {
          throw new Error(
            "ws:style must come from css`...`, for example ws:style={css`padding: 24px;`}."
          );
        }
        if (localStyles.length === 0) {
          throw new Error(
            "ws:style must include at least one valid CSS declaration from css`...`, for example ws:style={css`padding: 24px;`}."
          );
        }
        // create styles with breakpoints later to ensure more stable ids
        addLocalStyles(instanceId, localStyles);
        continue;
      }
      if (name === "style") {
        addLocalStyles(instanceId, convertReactStyleObject(value));
        continue;
      }
      if (name === "ws:tokens") {
        if (
          Array.isArray(value) === false ||
          value.every((token) => token instanceof Token) === false
        ) {
          throw new Error(
            'ws:tokens must be an array of token(...) values, for example ws:tokens={[token("brand", css`color: red;`)]}.'
          );
        }
        const tokens = value;
        // create tokens with breakpoints later to ensure more stable ids
        tokensByInstanceId.set(instanceId, tokens);
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
      const propMeta = options.componentMetas?.get(component)?.props?.[name];
      if (propMeta?.type === "animationAction") {
        const result = animationAction.safeParse(value);
        if (result.success === false) {
          const details = result.error.issues
            .map((issue) => {
              const path =
                issue.path.length === 0 ? "" : ` at "${issue.path.join(".")}"`;
              return `${issue.message}${path}`;
            })
            .join("; ");
          throw new Error(
            `Invalid JSX prop "${name}". Expected animationAction for ${component}.${name}. ${details}`
          );
        }
        props.push({ ...base, type: "animationAction", value: result.data });
        continue;
      }
      if (typeof value === "string") {
        props.push({ ...base, type: "string", value });
        continue;
      }
      if (typeof value === "number") {
        validateSerializablePropValue(name, value);
        props.push({ ...base, type: "number", value });
        continue;
      }
      if (typeof value === "boolean") {
        props.push({ ...base, type: "boolean", value });
        continue;
      }
      validateSerializablePropValue(name, value);
      props.push({ ...base, type: "json", value });
    }
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
    if (tag !== undefined) {
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
  if (
    options.allowManualIds === false &&
    (children.length === 0 || instances.length === 0)
  ) {
    throw new Error(
      "JSX fragment must contain at least one Webstudio component, for example <$.Box><$.Paragraph>Text</$.Paragraph></$.Box>."
    );
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
  // process tokens and add them to style sources
  const processedTokens = new Set<Token>();
  for (const [instanceId, tokens] of tokensByInstanceId) {
    const tokenIds: string[] = [];
    for (const token of tokens) {
      const tokenId = getTokenId(token);
      tokenIds.push(tokenId);
      // only create style source and styles once per token
      if (processedTokens.has(token)) {
        continue;
      }
      processedTokens.add(token);
      styleSources.push({
        type: "token",
        id: tokenId,
        name: token.name,
      });
      for (const { breakpoint, state, property, value } of token.styles) {
        const breakpointId = getBreakpointId(breakpoint);
        if (breakpointId === undefined) {
          continue;
        }
        styles.push({
          breakpointId,
          styleSourceId: tokenId,
          state,
          property: camelCaseProperty(property),
          value,
        });
      }
    }
    // merge tokens with existing selection (from ws:style) or create new selection
    const existingSelection = styleSourceSelections.find(
      (sel) => sel.instanceId === instanceId
    );
    if (existingSelection) {
      existingSelection.values.push(...tokenIds);
    } else {
      styleSourceSelections.push({
        instanceId,
        values: tokenIds,
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
    style?: Record<string, string | number | null | undefined>;
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
