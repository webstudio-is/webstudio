import type { PropItem } from "react-docgen-typescript";
import { PropMeta } from "./types";

export type FilterPredicate = (prop: PropItem) => boolean;

export const propsToArgTypes = (
  props: Record<string, PropItem>,
  exclude: string[]
) => {
  const entries = Object.entries(props);
  return (
    entries
      .sort((item1, item2) => {
        return item1[0].localeCompare(item2[0]);
      })
      // Exclude webstudio builder props see react-sdk/src/tree/webstudio-component.tsx
      .filter(([propName]) => propName.startsWith("data-ws-") === false)
      // Exclude props that are in the exclude list
      .filter(([propName]) => exclude.includes(propName) === false)
      .reduce(
        (result, current) => {
          const [propName, prop] = current;

          const argType = getArgType(prop);
          if (argType != null) {
            result[propName] = argType;
          }
          return result;
        },
        {} as Record<string, PropMeta>
      )
  );
};

const matchers = {
  color: new RegExp("(background|color)", "i"),
  date: /Date$/,
};

export const getArgType = (propItem: PropItem): PropMeta | undefined => {
  const { type, name, description, defaultValue } = propItem;

  // eslint-disable-next-line @typescript-eslint/ban-types
  const makePropMeta = (type: string, control: string, extra?: {}) =>
    PropMeta.parse({
      type,
      required: propItem.required,
      control,
      ...(defaultValue?.value == null
        ? {}
        : { defaultValue: defaultValue.value }),
      ...(description ? { description } : {}),
      ...extra,
    });

  // args that end with background or color e.g. iconColor
  if (matchers.color.test(name) && type.name === "string") {
    return makePropMeta("string", "color");
  }

  try {
    switch (type.name) {
      case "boolean":
      case "Booleanish":
        return makePropMeta("boolean", "boolean");
      case "number":
        return makePropMeta("number", "number");
      case "string":
        return makePropMeta("string", "text");
      case "string | number":
      case "number | string":
        if (defaultValue?.value === "") {
          return makePropMeta("number", "number", { defaultValue: undefined });
        } else if (
          defaultValue?.value == null ||
          typeof defaultValue.value === "number"
        ) {
          return makePropMeta("number", "number");
        } else {
          return makePropMeta("string", "text");
        }
      case "enum": {
        const options = type.value.map(({ value }: { value: string }) =>
          // remove additional quotes from enum values
          value.replace(/^"(.*)"$/, "$1")
        );
        return makePropMeta(
          "string",
          options.length <= 3 ? "radio" : "select",
          { options }
        );
      }
      case "function":
      case "symbol":
        return;
      default:
        // cast complex aria types to string
        if (name === "role" || name.startsWith("aria-")) {
          return makePropMeta("string", "text");
        }
        // ignore the rest of complex types
        return;
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log("Error while parsing prop:", propItem);
    throw error;
  }
};
