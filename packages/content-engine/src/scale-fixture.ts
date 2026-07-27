export type ScaleMarkdownFixtureFile = {
  id: string;
  name: string;
  source: string;
};

/** Deterministic schema-less Markdown corpus used by scale tests and benchmarks. */
export const createScaleMarkdownFixture = (
  count = 1000
): ScaleMarkdownFixtureFile[] =>
  Array.from({ length: count }, (_, index) => {
    const id = `post-${String(index).padStart(4, "0")}`;
    const optional =
      index % 3 === 0
        ? `\nseries:\n  name: Series ${index % 7}\n  position: ${index}`
        : "";
    const mixed =
      index % 5 === 0 ? `\nrating: ${index % 10}` : `\nrating: "${index % 10}"`;
    return {
      id,
      name: `${id}.md`,
      source: `---
title: Post ${index}
slug: ${id}
publishedAt: 2026-07-${String((index % 28) + 1).padStart(2, "0")}
draft: ${index % 10 === 0 ? "true" : "false"}
locale: ${index % 2 === 0 ? "en" : "de"}
author:
  name: Author ${index % 25}
tags:
  - tag-${index % 10}
  - group-${index % 4}${optional}${mixed}
---
# Post ${index}

Deterministic body ${index} for the asset-resource scale fixture.
`,
    };
  });
