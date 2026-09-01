import {
  createMdxCodeBlock,
  readMdxCodeBlock,
  type MdxAuthoredNode,
  type MdxAuthoredProp,
} from "@webstudio-is/content-engine/mdx";
import { mapAttributeNames } from "@webstudio-is/content-engine/jsx-attributes";
import {
  markdownAlertVariants,
  type MarkdownAlertType,
  type MarkdownAlertVariant,
} from "@webstudio-is/content-engine/markdown-alerts";
import type { Instance, Prop } from "@webstudio-is/sdk";

type MaterializedComponentProp = Readonly<{
  prop: MdxAuthoredProp;
  source?: Readonly<{
    nodePath: readonly number[];
    propIndex: number;
  }>;
  requiresAssetReference?: boolean;
}>;

type MaterializedComponent = Readonly<{
  children: Instance["children"] | "authored";
  props: readonly MaterializedComponentProp[];
}>;

type MdxComponentAdapter = Readonly<{
  component: Instance["component"];
  toMdx: (input: {
    instance: Instance;
    props: readonly MdxAuthoredProp[];
    instanceProps: readonly Prop[];
    original?: MdxAuthoredNode;
    authoredChildren?: readonly MdxAuthoredNode[];
  }) => MdxAuthoredNode | undefined;
  fromMdx: (node: MdxAuthoredNode) => MaterializedComponent | undefined;
}>;

const codeTextComponent = "CodeText";
const imageComponent = "Image";
const alertComponent = "Alert";
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
};

const readMdxImage = (node: MdxAuthoredNode) => {
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
  return image;
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
  toMdx: ({ instance, props, instanceProps }) => {
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
    return {
      type: "element",
      syntax: "mdx",
      tag: "p",
      props: [],
      children: [
        {
          type: "element",
          syntax: "mdx",
          tag: "img",
          props: imageProps,
          children: [],
          mdxMode: "text",
        },
      ],
      mdxMode: "flow",
    };
  },
  fromMdx: (node) => {
    const image = readMdxImage(node);
    if (image === undefined) {
      return;
    }
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
          source: { nodePath: [0], propIndex },
        });
      }
    }
    const sourceIndex = image.props.findIndex(({ name }) => name === "src");
    const source = image.props[sourceIndex];
    if (sourceIndex !== -1 && typeof source?.value === "string") {
      const sourceLocation = { nodePath: [0], propIndex: sourceIndex };
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
};

const alertAdapter: MdxComponentAdapter = {
  component: alertComponent,
  toMdx: ({ props, original, authoredChildren }) => {
    if (
      original?.type !== "element" ||
      original.syntax !== "markdown" ||
      original.markdownAlert === undefined ||
      authoredChildren === undefined
    ) {
      return;
    }
    const values = getStringProps(props);
    if (
      values === undefined ||
      Array.from(values.keys()).some((name) => name !== "variant")
    ) {
      return;
    }
    const variant = values.get("variant") ?? "note";
    if (Object.hasOwn(markdownAlertVariants, variant) === false) {
      return;
    }
    return {
      ...original,
      markdownAlert: variant.toUpperCase() as MarkdownAlertType,
      children: authoredChildren,
    };
  },
  fromMdx: (node) => {
    if (
      node.type !== "element" ||
      node.syntax !== "markdown" ||
      node.markdownAlert === undefined
    ) {
      return;
    }
    return {
      children: "authored",
      props: [
        {
          prop: {
            name: "variant",
            value: node.markdownAlert.toLowerCase() as MarkdownAlertVariant,
          },
        },
      ],
    };
  },
};

const componentAdapters = new Map<Instance["component"], MdxComponentAdapter>([
  [codeTextAdapter.component, codeTextAdapter],
  [imageAdapter.component, imageAdapter],
  [alertAdapter.component, alertAdapter],
]);

export const usesMdxComponentAuthoredChildren = (
  component: Instance["component"]
) => component === alertComponent;

export const serializeMdxComponent = ({
  instance,
  props,
  instanceProps,
  original,
  authoredChildren,
}: {
  instance: Instance;
  props: readonly MdxAuthoredProp[];
  instanceProps: readonly Prop[];
  original?: MdxAuthoredNode;
  authoredChildren?: readonly MdxAuthoredNode[];
}) =>
  componentAdapters
    .get(instance.component)
    ?.toMdx({ instance, props, instanceProps, original, authoredChildren });

export const serializeMdxComponentFallback = ({
  instance,
  props,
  instanceProps,
  templateName,
}: {
  instance: Instance;
  props: readonly MdxAuthoredProp[];
  instanceProps: readonly Prop[];
  templateName?: string;
}): MdxAuthoredNode | undefined => {
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
    name: templateName ?? adapter.component,
    props: mapAttributeNames({
      attributes: authoredProps,
      direction: "instance-to-jsx",
      acceptsHtmlAttributes: true,
    }),
    children,
    mdxMode: children.length === 0 ? "flow" : "text",
  };
};

export const materializeMdxComponent = (node: MdxAuthoredNode) => {
  for (const adapter of componentAdapters.values()) {
    const component = adapter.fromMdx(node);
    if (component !== undefined) {
      return { ...component, component: adapter.component };
    }
  }
};
