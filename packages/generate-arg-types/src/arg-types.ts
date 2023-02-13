import type { PropItem } from "react-docgen-typescript";

export type FilterPredicate = (prop: PropItem) => boolean;

const validAttributes = (prop: PropItem) => {
  if (prop.parent) {
    // Pass *HTML (both ButtonHTMLAttributes and HTMLAttributes), Aria, and SVG attributes through
    const matcher = /.?(HTML|SVG|Aria)Attributes/;
    // TODO: Add a test for this
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }, {} as Record<string, any>);
};

const matchers = {
  color: new RegExp("(background|color)", "i"),
  date: /Date$/,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getArgType = (propItem: any) => {
  const { type, name } = propItem;
  if (!type) {
    return undefined;
  }

  const overrides = {
    defaultValue: propItem.defaultValue?.value ?? null,
    options: propItem.options,
    required: propItem.required,
  };

  // args that end with background or color e.g. iconColor
  if (matchers.color && matchers.color.test(name)) {
    const controlType = propItem.type.name;

    if (controlType === "string") {
      return { ...overrides, type: "color" };
    }
  }

  // args that end with date e.g. purchaseDate
  if (matchers.date && matchers.date.test(name)) {
    return { ...overrides, type: "date" };
  }

  switch (type?.name) {
    case "array":
      return { ...overrides, type: "object" };
    case "boolean":
    case "Booleanish":
      return { ...overrides, type: "boolean" };
    case "string":
      return { ...overrides, type: "text" };
    case "number":
      return { ...overrides, type: "number" };
    case "enum": {
      const { value } = type;
      // Remove additional quotes from enum values
      // @ts-expect-error Original type has `any` type
      const values = value.map((val) => val.value.replace(/^"(.+)"$/, "$1"));
      return {
        ...overrides,
        type: values?.length <= 5 ? "radio" : "select",
        options: values,
      };
    }
    case "function":
    case "symbol":
      return null;
    default:
      return { ...overrides, type: "text" };
  }
};
