import {
  reactPropsToStandardAttributes,
  standardAttributesToReactProps,
} from "@webstudio-is/react-sdk";
import { ariaAttributes, attributesByTag } from "@webstudio-is/html-data";
import { propsToArgTypes } from "../arg-types";

const ignoreComponents = new Set(["Embed"]);

/**
 * Adds descriptions to component props (argTypes).
 *
 * There are a number of description sources. Below is a list sorted by most specific to less specific.
 *
 * 1. Custom descriptions located in the component's package @webstudio-is/html-data/src/props-descriptions.ts module.
 * 2. Shared overridePropsDescriptions located in this package's @webstudio-is/html-data module.
 * 3. Component's meta props descriptions (extracted from inline TypeScript docs).
 * 4. Generic htmlPropsDescriptions located in this package's @webstudio-is/html-data module.
 */
export const addDescriptions = (
  componenName: string,
  argTypes: ReturnType<typeof propsToArgTypes>,
  customDescriptions: { [key in string]: string } = {}
) => {
  if (componenName && ignoreComponents.has(componenName)) {
    return;
  }

  Object.entries(argTypes).forEach(([propName, meta]) => {
    const description = getDescription(
      propName,
      meta.description,
      customDescriptions
    );

    if (typeof description === "string") {
      argTypes[propName].description = description;
    }
  });
};

const attributeDescriptions: Record<string, string> = {};
for (const attribute of Object.values(attributesByTag).flat()) {
  if (attribute) {
    attributeDescriptions[attribute.name] = attribute.description;
  }
}
for (const attribute of ariaAttributes) {
  attributeDescriptions[attribute.name] = attribute.description;
}

export const getDescription = (
  propName: string,
  currentDescription: string | undefined,
  customDescriptions: { [key in string]: string } = {}
): string | undefined => {
  const name =
    standardAttributesToReactProps[propName] ||
    reactPropsToStandardAttributes[propName] ||
    propName.toLowerCase();
  return (
    customDescriptions[propName] ||
    customDescriptions[name] ||
    currentDescription ||
    attributeDescriptions[propName] ||
    attributeDescriptions[name]
  );
};
