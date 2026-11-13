import {
  reactPropsToStandardAttributes,
  standardAttributesToReactProps,
} from "./__generated__/standard-attributes";

type JsxPropContext = Readonly<{
  acceptsHtmlAttributes: boolean;
  componentPropNames?: ReadonlySet<string>;
}>;

type AttributeNameDirection = "instance-to-jsx" | "jsx-to-instance";

type NamedAttribute = Readonly<{ name: string }>;

type MappedAttribute<Attribute extends NamedAttribute> = Omit<
  Attribute,
  "name"
> & { name: string };

export const assertUniqueAttributeNames = (
  attributes: readonly NamedAttribute[]
) => {
  const names = new Set<string>();
  for (const { name } of attributes) {
    if (names.has(name)) {
      throw new Error(`Multiple properties map to "${name}"`);
    }
    names.add(name);
  }
};

export const getJsxPropName = ({
  instancePropName,
  acceptsHtmlAttributes,
  componentPropNames,
}: JsxPropContext & { instancePropName: string }) => {
  if (instancePropName === "class") {
    return "className";
  }
  if (componentPropNames?.has(instancePropName)) {
    return instancePropName;
  }
  if (acceptsHtmlAttributes === false) {
    return instancePropName;
  }
  return standardAttributesToReactProps[instancePropName] ?? instancePropName;
};

export const getInstancePropName = ({
  jsxPropName,
  acceptsHtmlAttributes,
  componentPropNames,
}: JsxPropContext & { jsxPropName: string }) => {
  if (jsxPropName === "className") {
    return "class";
  }
  if (componentPropNames?.has(jsxPropName)) {
    return jsxPropName;
  }
  if (acceptsHtmlAttributes === false) {
    return jsxPropName;
  }
  return reactPropsToStandardAttributes[jsxPropName] ?? jsxPropName;
};

export const mapAttributeNames = <Attribute extends NamedAttribute>({
  attributes,
  direction,
  acceptsHtmlAttributes,
  componentPropNames,
}: JsxPropContext & {
  attributes: readonly Attribute[];
  direction: AttributeNameDirection;
}): MappedAttribute<Attribute>[] => {
  const mappedAttributes = attributes.map((attribute) => {
    const name =
      direction === "instance-to-jsx"
        ? getJsxPropName({
            instancePropName: attribute.name,
            acceptsHtmlAttributes,
            componentPropNames,
          })
        : getInstancePropName({
            jsxPropName: attribute.name,
            acceptsHtmlAttributes,
            componentPropNames,
          });
    return { ...attribute, name };
  });
  assertUniqueAttributeNames(mappedAttributes);
  return mappedAttributes;
};

export {
  reactPropsToStandardAttributes,
  standardAttributesToReactProps,
} from "./__generated__/standard-attributes";
