/** Builds persisted IDs only for exported Radix component names. */
type RadixComponentName = keyof typeof import("../components");

export const getRadixComponentId = <Name extends RadixComponentName>(
  name: Name
) => `@webstudio-is/sdk-components-react-radix:${name}` as const;
