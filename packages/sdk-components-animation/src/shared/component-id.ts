/** Builds persisted IDs only for exported animation component names. */
type AnimationComponentName = keyof typeof import("../components");

export const getAnimationComponentId = <Name extends AnimationComponentName>(
  name: Name
) => `@webstudio-is/sdk-components-animation:${name}` as const;
