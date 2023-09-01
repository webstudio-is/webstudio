import type { StyleSource, StyleSources } from "../schema/style-sources";

export const parseStyleSources = (styleSourceString: string): StyleSources => {
  const styleSourcesList = JSON.parse(styleSourceString) as StyleSource[];
  return new Map(styleSourcesList.map((item) => [item.id, item]));
};

export const serializeStyleSources = (styleSourcesMap: StyleSources) => {
  const styleSourcesList: StyleSource[] = Array.from(styleSourcesMap.values());
  return JSON.stringify(styleSourcesList);
};
