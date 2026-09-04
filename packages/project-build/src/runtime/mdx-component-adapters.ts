/**
 * Defines the component-specific conversions that preserve Markdown semantics
 * and static props when moving between MDX nodes and Webstudio instances.
 */
import {
  createMdxCodeBlock,
  isMdxTemplateComponentName,
  readMdxCodeBlock,
  type MdxAuthoredNode,
  type MdxAuthoredProp,
  type MdxMode,
} from "@webstudio-is/content-engine/mdx";
import { mapAttributeNames } from "@webstudio-is/content-engine/jsx-attributes";
import {
  getContentBlockMdxTemplateDescriptor,
  getHtmlTagFromInstance,
  type Instance,
  type Prop,
  type WsComponentMeta,
} from "@webstudio-is/sdk";

type MaterializedComponentProp = Readonly<{
  prop: MdxAuthoredProp;
  source?: Readonly<{
    nodePath: readonly number[];
    propIndex: number;
  }>;
  requiresAssetReference?: boolean;
}>;

type MaterializedComponent = Readonly<{
  children: Instance["children"];
  props: readonly MaterializedComponentProp[];
}>;

type MdxComponentAdapter = Readonly<{
  component: Instance["component"];
  toMdx: (input: {
    instance: Instance;
    props: readonly MdxAuthoredProp[];
    instanceProps: readonly Prop[];
    original?: MdxAuthoredNode;
  }) => MdxAuthoredNode | undefined;
  fromMdx: (node: MdxAuthoredNode) => MaterializedComponent | undefined;
  fromNamedMdx?: (
    node: Extract<MdxAuthoredNode, { type: "template" }>
  ) => MaterializedComponent | undefined;
}>;

const codeTextComponent = "CodeText";
const imageComponent = "Image";
const derivedImageAssetPropNames = new Set(["width", "height", "alt"]);

const getStringProps = (props: readonly MdxAuthoredProp[]) => {
  const values = new Map<string, string>();
  for (const prop of props) {
    if (typeof prop.value !== "string" || values.has(prop.name)) {
      return;
    }
    values.set(prop.name, prop.value);
  }
  return values;
};

const materializeNamedProps = (props: readonly MdxAuthoredProp[]) =>
  props.map((prop, propIndex) => ({
    prop,
    source: { nodePath: [], propIndex },
  }));

const codeTextAdapter: MdxComponentAdapter = {
  component: codeTextComponent,
  toMdx: ({ instance, props }) => {
    const values = getStringProps(props);
    if (values === undefined) {
      return;
    }
    const unsupportedProps = Array.from(values.keys()).filter(
      (name) => name !== "code" && name !== "language" && name !== "theme"
    );
    const language = values.get("language");
    const theme = values.get("theme");
    if (unsupportedProps.length > 0 || theme !== undefined) {
      return;
    }

    const textChildren =
      instance.children.length > 0 &&
      instance.children.every((child) => child.type === "text")
        ? instance.children.map((child) => child.value).join("")
        : undefined;
    const code = textChildren ?? values.get("code") ?? "";
    if (
      (textChildren === undefined && values.has("code") === false) ||
      code.endsWith("\n")
    ) {
      return;
    }

    return createMdxCodeBlock({
      value: code,
      language,
    });
  },
  fromMdx: (node) => {
    const code = readMdxCodeBlock(node);
    if (code === undefined) {
      return;
    }
    return {
      children: [{ type: "text", value: code.value }],
      props:
        code.language === undefined
          ? []
          : [{ prop: { name: "language", value: code.language } }],
    };
  },
  fromNamedMdx: (node) => {
    if (node.children.some(({ type }) => type !== "text")) {
      return;
    }
    return {
      children: node.children.flatMap((child) =>
        child.type === "text"
          ? [{ type: "text" as const, value: child.value }]
          : []
      ),
      props: materializeNamedProps(node.props),
    };
  },
};

const readMdxImage = (node: MdxAuthoredNode) => {
  if (
    node.type === "element" &&
    node.syntax === "markdown" &&
    node.tag === "img" &&
    node.children.length === 0
  ) {
    return { image: node, nodePath: [] } as const;
  }
  if (
    node.type !== "element" ||
    node.syntax !== "markdown" ||
    node.tag !== "p" ||
    node.props.length > 0 ||
    node.children.length !== 1
  ) {
    return;
  }
  const image = node.children[0];
  if (
    image?.type !== "element" ||
    image.syntax !== "markdown" ||
    image.tag !== "img" ||
    image.children.length > 0
  ) {
    return;
  }
  return { image, nodePath: [0] } as const;
};

const getDerivedImageAssetPropIds = (instanceProps: readonly Prop[]) => {
  const source = instanceProps.find(
    (prop) => prop.name === "src" && prop.type === "asset"
  );
  const derivedAssetProps = instanceProps.filter(
    (prop) => prop.type === "asset" && derivedImageAssetPropNames.has(prop.name)
  );
  const derivedAssetIds = new Set(derivedAssetProps.map(({ value }) => value));
  const assetId =
    source?.type === "asset"
      ? source.value
      : derivedAssetProps.length >= 2 && derivedAssetIds.size === 1
        ? derivedAssetProps[0]?.value
        : undefined;
  return new Set(
    instanceProps.flatMap((prop) =>
      prop.type === "asset" &&
      prop.value === assetId &&
      derivedImageAssetPropNames.has(prop.name)
        ? [prop.id]
        : []
    )
  );
};

export const getDerivedMdxComponentPropIds = ({
  instance,
  instanceProps,
}: {
  instance: Instance;
  instanceProps: readonly Prop[];
}) =>
  instance.component === imageComponent
    ? getDerivedImageAssetPropIds(instanceProps)
    : new Set<Prop["id"]>();

export const normalizeMdxComponentProps = ({
  instance,
  props,
  instanceProps,
}: {
  instance: Instance;
  props: readonly MdxAuthoredProp[];
  instanceProps: readonly Prop[];
}) => {
  const derivedPropIds = getDerivedMdxComponentPropIds({
    instance,
    instanceProps,
  });
  if (derivedPropIds.size === 0) {
    return props;
  }
  const derivedPropNames = new Set(
    instanceProps.flatMap((prop) =>
      derivedPropIds.has(prop.id) ? [prop.name] : []
    )
  );
  return props.filter(({ name }) => derivedPropNames.has(name) === false);
};

const imageAdapter: MdxComponentAdapter = {
  component: imageComponent,
  toMdx: ({ instance, props, instanceProps, original }) => {
    if (instance.children.length > 0) {
      return;
    }
    const values = getStringProps(
      normalizeMdxComponentProps({ instance, props, instanceProps })
    );
    if (
      values === undefined ||
      Array.from(values.keys()).some(
        (name) => name !== "src" && name !== "alt" && name !== "title"
      )
    ) {
      return;
    }
    const imageProps: MdxAuthoredProp[] = [
      { name: "src", value: values.get("src") ?? "" },
      { name: "alt", value: values.get("alt") ?? "" },
    ];
    const title = values.get("title");
    if (title !== undefined) {
      imageProps.push({ name: "title", value: title });
    }
    const image = {
      type: "element" as const,
      syntax: "mdx" as const,
      tag: "img",
      props: imageProps,
      children: [],
      mdxMode: "text" as const,
    };
    if (original?.type === "element" && original.tag === "img") {
      return image;
    }
    return {
      type: "element",
      syntax: "mdx",
      tag: "p",
      props: [],
      children: [image],
      mdxMode: "flow",
    };
  },
  fromMdx: (node) => {
    const result = readMdxImage(node);
    if (result === undefined) {
      return;
    }
    const { image, nodePath } = result;
    const props: MaterializedComponentProp[] = [];
    const names = new Set<string>();
    for (const [propIndex, prop] of image.props.entries()) {
      if (
        typeof prop.value !== "string" ||
        (prop.name !== "src" && prop.name !== "alt" && prop.name !== "title") ||
        names.has(prop.name)
      ) {
        return;
      }
      names.add(prop.name);
      if (prop.value !== "") {
        props.push({
          prop,
          source: { nodePath, propIndex },
        });
      }
    }
    const sourceIndex = image.props.findIndex(({ name }) => name === "src");
    const source = image.props[sourceIndex];
    if (sourceIndex !== -1 && typeof source?.value === "string") {
      const sourceLocation = { nodePath, propIndex: sourceIndex };
      for (const name of ["width", "height"] as const) {
        props.push({
          prop: { name, value: source.value },
          source: sourceLocation,
          requiresAssetReference: true,
        });
      }
      if (
        image.props.some(({ name, value }) => name === "alt" && value !== "")
      ) {
        return { children: [], props };
      }
      props.push({
        prop: { name: "alt", value: source.value },
        source: sourceLocation,
        requiresAssetReference: true,
      });
    }
    return { children: [], props };
  },
  fromNamedMdx: (node) => {
    if (node.children.length > 0) {
      return;
    }
    const materializedProps: MaterializedComponentProp[] =
      materializeNamedProps(node.props);
    const sourceIndex = materializedProps.findIndex(
      ({ prop }) => prop.name === "src" && typeof prop.value === "string"
    );
    const source = materializedProps[sourceIndex]?.prop;
    if (sourceIndex === -1 || typeof source?.value !== "string") {
      return { children: [], props: materializedProps };
    }
    const names = new Set(materializedProps.map(({ prop }) => prop.name));
    const sourceLocation = { nodePath: [], propIndex: sourceIndex };
    for (const name of ["width", "height", "alt"] as const) {
      if (names.has(name)) {
        continue;
      }
      materializedProps.push({
        prop: { name, value: source.value },
        source: sourceLocation,
        requiresAssetReference: true,
      });
    }
    return { children: [], props: materializedProps };
  },
};

const componentAdapters = new Map<Instance["component"], MdxComponentAdapter>([
  [codeTextAdapter.component, codeTextAdapter],
  [imageAdapter.component, imageAdapter],
]);

export const hasMdxComponentAdapter = (component: Instance["component"]) =>
  componentAdapters.has(component);

export const getMdxNamedTemplateSyntax = ({
  templateName,
  component,
}: {
  templateName: string;
  component?: Instance["component"];
}) =>
  isMdxTemplateComponentName(templateName) &&
  (hasMdxComponentAdapter(templateName) === false || templateName === component)
    ? ("jsx" as const)
    : ("ws-element" as const);

export const getMdxNamedTemplateComponentBinding = ({
  instance,
  node,
}: {
  instance: Instance;
  node: Extract<MdxAuthoredNode, { type: "template" }>;
}) => componentAdapters.get(instance.component)?.fromNamedMdx?.(node);

export const getMdxStandardTemplateBinding = (node: MdxAuthoredNode) => {
  const adapted = materializeMdxComponent(node);
  if (adapted !== undefined) {
    return {
      key: `component:${adapted.component}`,
      props: adapted.props.map(({ prop }) => prop),
      propBindings: adapted.props.map(({ source, requiresAssetReference }) => ({
        source,
        requiresAssetReference,
      })),
      componentChildren: adapted.children,
    };
  }
  if (node.type === "element") {
    return {
      key: `element:${node.tag}`,
      props: node.props,
      propBindings: undefined,
      componentChildren: undefined,
    };
  }
};

export const getMdxStandardTemplateKeyForInstance = ({
  instance,
  metas,
  props,
  htmlTagsByInstanceId,
}: {
  instance: Instance;
  metas: ReadonlyMap<Instance["component"], WsComponentMeta>;
  props?: ReadonlyMap<Prop["id"], Prop>;
  htmlTagsByInstanceId?: ReadonlyMap<Instance["id"], string>;
}) => {
  if (componentAdapters.has(instance.component)) {
    return `component:${instance.component}`;
  }
  const tag = getHtmlTagFromInstance({
    instance,
    metas,
    props,
    htmlTagsByInstanceId,
  });
  const descriptor = getContentBlockMdxTemplateDescriptor({
    component: instance.component,
    tag,
  });
  if (descriptor !== undefined) {
    return descriptor.resolutionKey;
  }
  if (tag !== undefined) {
    return `element:${tag}`;
  }
};

export const serializeMdxComponent = ({
  instance,
  props,
  instanceProps,
  original,
}: {
  instance: Instance;
  props: readonly MdxAuthoredProp[];
  instanceProps: readonly Prop[];
  original?: MdxAuthoredNode;
}) =>
  componentAdapters
    .get(instance.component)
    ?.toMdx({ instance, props, instanceProps, original });

export const serializeMdxComponentFallback = ({
  instance,
  props,
  instanceProps,
  templateName,
  mdxMode,
  jsxPropContext,
}: {
  instance: Instance;
  props: readonly MdxAuthoredProp[];
  instanceProps: readonly Prop[];
  templateName?: string;
  mdxMode?: MdxMode;
  jsxPropContext?: Readonly<{
    acceptsHtmlAttributes: boolean;
    componentPropNames: readonly string[];
  }>;
}): Extract<MdxAuthoredNode, { type: "template" }> | undefined => {
  const adapter = componentAdapters.get(instance.component);
  if (adapter === undefined) {
    return;
  }
  const authoredProps: MdxAuthoredProp[] = [];
  const propNames = new Set<string>();
  let legacyCode: string | undefined;
  const componentProps = normalizeMdxComponentProps({
    instance,
    props,
    instanceProps,
  });
  for (const prop of componentProps) {
    if (adapter.component === codeTextComponent && prop.name === "code") {
      if (typeof prop.value !== "string" || legacyCode !== undefined) {
        return;
      }
      legacyCode = prop.value;
      continue;
    }
    if (propNames.has(prop.name)) {
      return;
    }
    propNames.add(prop.name);
    authoredProps.push(prop);
  }
  let children = instance.children.flatMap((child) =>
    child.type === "text" ? [{ type: "text" as const, value: child.value }] : []
  );
  if (children.length !== instance.children.length) {
    return;
  }
  if (children.length === 0 && legacyCode !== undefined) {
    children = [{ type: "text", value: legacyCode }];
  }
  return {
    type: "template",
    syntax: getMdxNamedTemplateSyntax({
      templateName: templateName ?? adapter.component,
      component: instance.component,
    }),
    selfClosing: children.length === 0,
    name: templateName ?? adapter.component,
    props: mapAttributeNames({
      attributes: authoredProps,
      direction: "instance-to-jsx",
      acceptsHtmlAttributes: jsxPropContext?.acceptsHtmlAttributes ?? true,
      componentPropNames:
        jsxPropContext === undefined
          ? undefined
          : new Set(jsxPropContext.componentPropNames),
    }),
    children,
    mdxMode: children.length === 0 ? (mdxMode ?? "flow") : "text",
  };
};

export const materializeMdxComponent = (node: MdxAuthoredNode) => {
  if (node.type === "template") {
    if (node.syntax !== "jsx") {
      return;
    }
    const adapter = componentAdapters.get(node.name);
    const component = adapter?.fromNamedMdx?.(node);
    return component === undefined || adapter === undefined
      ? undefined
      : { ...component, component: adapter.component };
  }
  for (const adapter of componentAdapters.values()) {
    const component = adapter.fromMdx(node);
    if (component !== undefined) {
      return { ...component, component: adapter.component };
    }
  }
};
