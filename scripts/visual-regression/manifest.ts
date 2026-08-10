import { readFile } from "node:fs/promises";
import path from "node:path";
import { glob } from "node:fs/promises";
import { loadCsf } from "storybook/internal/csf-tools";
import { toId } from "storybook/internal/csf";
import type { StoryEntry } from "./shared";

const storyScopes = [
  {
    pattern: "apps/builder/**/*.stories.tsx",
    titlePrefix: "Builder",
  },
  {
    pattern: "packages/design-system/src/components/**/*.stories.tsx",
    titlePrefix: "Design system",
  },
] as const;

export type VisualStoryEntry = StoryEntry & {
  exportName: string;
  file: string;
  titlePrefix: string;
};

const readScopeEntries = async ({
  root,
  pattern,
  titlePrefix,
}: {
  root: string;
  pattern: string;
  titlePrefix: string;
}) => {
  const entries: VisualStoryEntry[] = [];
  for await (const file of glob(pattern, { cwd: root })) {
    const source = await readFile(path.join(root, file), "utf8");
    const csf = loadCsf(source, {
      fileName: file,
      makeTitle: (title) => `${titlePrefix}/${title}`,
    });
    csf.parse();
    for (const story of csf.indexInputs) {
      if (story.type !== "story") {
        continue;
      }
      if (
        story.title === undefined ||
        story.name === undefined ||
        story.exportName === undefined
      ) {
        throw new Error(`Story index metadata is incomplete in ${file}`);
      }
      entries.push({
        id: story.__id ?? toId(story.title, story.name),
        title: story.title,
        name: story.name,
        exportName: story.exportName,
        file,
        titlePrefix,
      });
    }
  }
  return entries;
};

export const readStoryManifest = async (root: string) => {
  const entries = (
    await Promise.all(
      storyScopes.map(({ pattern, titlePrefix }) =>
        readScopeEntries({ root, pattern, titlePrefix })
      )
    )
  )
    .flat()
    .sort((left, right) => left.id.localeCompare(right.id));

  const duplicate = entries.find(
    (entry, index) => entry.id === entries[index - 1]?.id
  );
  if (duplicate !== undefined) {
    throw new Error(`Duplicate visual story id: ${duplicate.id}`);
  }
  return Object.fromEntries(entries.map((entry) => [entry.id, entry]));
};
