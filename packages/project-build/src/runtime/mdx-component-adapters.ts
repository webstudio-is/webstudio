import {
  createMdxCodeBlock,
  readMdxCodeBlock,
  type MdxAuthoredNode,
  type MdxAuthoredProp,
} from "@webstudio-is/content-engine/mdx";
import { mapAttributeNames } from "@webstudio-is/content-engine/jsx-attributes";
import type { Instance, Prop } from "@webstudio-is/sdk";
import { serializeMdxStaticProp } from "./mdx-static-props";

type MaterializedComponent = Readonly<{
  children: Instance["children"];
  props: readonly MdxAuthoredProp[];
}>;

type MdxComponentAdapter = Readonly<{
  component: Instance["component"];
  toMdx: (input: {
    instance: Instance;
    props: readonly Prop[];
    original?: MdxAuthoredNode;
  }) => MdxAuthoredNode | undefined;
  fromMdx: (node: MdxAuthoredNode) => MaterializedComponent | undefined;
}>;

const codeTextComponent = "CodeText";

const getStringProps = (props: readonly Prop[]) => {
  const values = new Map<string, string>();
  for (const prop of props) {
    if (prop.type !== "string" || values.has(prop.name)) {
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
          : [{ name: "language", value: code.language }],
    };
  },
};

const componentAdapters = new Map<Instance["component"], MdxComponentAdapter>([
  [codeTextAdapter.component, codeTextAdapter],
]);

export const serializeMdxComponent = ({
  instance,
  props,
  original,
}: {
  instance: Instance;
  props: readonly Prop[];
  original?: MdxAuthoredNode;
}) =>
  componentAdapters
    .get(instance.component)
    ?.toMdx({ instance, props, original });

export const serializeMdxComponentFallback = ({
  instance,
  props,
  templateName,
}: {
  instance: Instance;
  props: readonly Prop[];
  templateName?: string;
}): MdxAuthoredNode | undefined => {
  const adapter = componentAdapters.get(instance.component);
  if (adapter === undefined) {
    return;
  }
  const authoredProps: MdxAuthoredProp[] = [];
  const propNames = new Set<string>();
  let legacyCode: string | undefined;
  for (const prop of props) {
    if (adapter.component === codeTextComponent && prop.name === "code") {
      if (prop.type !== "string" || legacyCode !== undefined) {
        return;
      }
      legacyCode = prop.value;
      continue;
    }
    if (propNames.has(prop.name)) {
      return;
    }
    propNames.add(prop.name);
    const authoredProp = serializeMdxStaticProp(prop);
    if (authoredProp === undefined) {
      return;
    }
    authoredProps.push(authoredProp);
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
