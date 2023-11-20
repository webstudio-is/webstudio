import {
  domAttributesToReact,
  reactPropsToDomAttributes,
} from "@webstudio-is/html-data";
import {
  htmlPropsDescriptions,
  overridePropsDescriptions,
} from "@webstudio-is/html-data";
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
      componenName,
      propName,
      meta.description,
      customDescriptions
    );

    if (typeof description === "string") {
      argTypes[propName].description = description;
    }
  });
};

export const getDescription = (
  componentName: string,
  propName: string,
  currentDescription: string | undefined,
  customDescriptions: { [key in string]: string } = {}
): string | undefined => {
  const name = (domAttributesToReact[
    propName as keyof typeof domAttributesToReact
  ] ||
    reactPropsToDomAttributes[propName] ||
    propName.toLowerCase()) as keyof typeof htmlPropsDescriptions &
    keyof typeof overridePropsDescriptions;

  return (
    customDescriptions[propName] ||
    customDescriptions[name] ||
    overridePropsDescriptions[
      propName as keyof typeof overridePropsDescriptions
    ] ||
    overridePropsDescriptions[name] ||
    currentDescription ||
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    htmlPropsDescriptions[`${componentName.toLowerCase()}:${name}`] ||
    htmlPropsDescriptions[name]
  );
};
