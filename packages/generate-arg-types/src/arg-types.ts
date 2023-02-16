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
    const [propName, prop] = current;

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

export const getArgType = (propItem: PropItem): PropMeta | undefined => {
  const { type, name, description, defaultValue } = propItem;

  const common = (typeName: string = type.name) => ({
    type: { name: typeName, required: propItem.required },
    ...(defaultValue?.value == null
      ? {}
      : { defaultValue: defaultValue.value }),
    ...(description ? { description } : {}),
  });

  // args that end with background or color e.g. iconColor
  if (matchers.color && matchers.color.test(name) && type.name === "string") {
    return PropMeta.parse({ ...common(), control: "color" });
  }

  switch (type.name) {
    case "boolean":
    case "Booleanish":
      return PropMeta.parse({ ...common("boolean"), control: "boolean" });
    case "number":
      return PropMeta.parse({ ...common("number"), control: "number" });
    case "enum": {
      const values = type.value.map(({ value }: { value: string }) =>
        // remove additional quotes from enum values
        value.replace(/^"(.*)"$/, "$1")
      );
      return PropMeta.parse({
        ...common("string"),
        control: {
          type: values.length <= 5 ? "radio" : "select",
          options: values,
        },
      });
    }
    case "function":
    case "symbol":
      return;
    default:
      // @todo: we need some checks here. for example type.name can be "ImageLoader"
      return PropMeta.parse({ ...common(), control: "text" });
  }
};
