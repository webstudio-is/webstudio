import type { PropItem } from "react-docgen-typescript";
import { PropMeta } from "./types";

export type FilterPredicate = (prop: PropItem) => boolean;

const validAttributes = (prop: PropItem) => {
  if (prop.parent) {
    // Pass *HTML (both ButtonHTMLAttributes and HTMLAttributes), Aria, and SVG attributes through
    const matcher = /.?(HTML|SVG|Aria)Attributes/;
    // @todo: Add a test for this
    return prop.parent.name.match(matcher);
  }
  // Always allow component's own props
  return true;
};

export const propsToArgTypes = (
  props: Record<string, PropItem>,
  filter?: FilterPredicate
) => {
  const filterFn = filter ?? validAttributes;
  const entries = Object.entries(props);
  return entries.reduce((result, current) => {
    // @todo need halp
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [propName, prop] = current as any;

    // Filter out props
    if (!filterFn(prop)) {
      return result;
    }

    const argType = getArgType(prop);
    if (argType != null) {
      result[propName] = argType;
    }
    return result;
  }, {} as Record<string, PropMeta>);
};

const matchers = {
  color: new RegExp("(background|color)", "i"),
  date: /Date$/,
};

const toPropMeta = (
  control: PropMeta["control"],
  dataType: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rest: any
) =>
  PropMeta.parse({
    control,
    dataType,
    ...rest,
  });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getArgType = (propItem: any): PropMeta | undefined => {
  const { type, name } = propItem;
  if (!type) {
    return;
  }

  const common = {
    defaultValue: propItem.defaultValue?.value ?? null,
    required: propItem.required,
  };

  // args that end with background or color e.g. iconColor
  if (matchers.color && matchers.color.test(name) && type.name === "string") {
    return toPropMeta("color", type.name, common);
  }

  switch (type.name) {
    case "boolean":
    case "Booleanish":
    case `boolean | "true" | "false" | "mixed"`:
      return toPropMeta("boolean", "boolean", common);
    case "number":
      return toPropMeta("number", "number", common);
    case "enum": {
      // Remove additional quotes from enum values
      // @ts-expect-error Original type has `any` type
      const values = type.value.map((val) =>
        val.value.replace(/^"(.*)"$/, "$1")
      );
      const control = values.length <= 5 ? "radio" : "select";
      return toPropMeta(control, "string", { ...common, options: values });
    }
    case "function":
    case "symbol":
      return;
    default:
      // @todo: we need some checks here. for example type.name can be "ImageLoader"
      return toPropMeta("text", type.name, common);
  }
};
