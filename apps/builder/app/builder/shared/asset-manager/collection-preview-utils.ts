import {
  isPathnamePattern,
  tokenizePathnamePattern,
} from "@webstudio-is/project-build/runtime";

export const isCollectionPreviewPath = (path: string, slugField: string) => {
  if (isPathnamePattern(path) === false) {
    return false;
  }
  const parameters = tokenizePathnamePattern(path).flatMap((token) =>
    token.type === "param" ? [token] : []
  );
  return (
    parameters.some(({ name }) => name === slugField) &&
    parameters.every(
      ({ name, optional, splat }) =>
        name === slugField || optional === true || splat === true
    )
  );
};
