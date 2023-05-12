import { StyleSourcesList, StyleSources } from "../schema/style-sources";

export const parseStyleSources = (
  styleSourceString: string,
  skipValidation = false
): StyleSources => {
  const styleSourcesList = skipValidation
    ? (JSON.parse(styleSourceString) as StyleSourcesList)
    : StyleSourcesList.parse(JSON.parse(styleSourceString));
  return new Map(styleSourcesList.map((item) => [item.id, item]));
};

export const serializeStyleSources = (styleSourcesMap: StyleSources) => {
  const styleSourcesList: StyleSourcesList = Array.from(
    styleSourcesMap.values()
  );
  return JSON.stringify(styleSourcesList);
};
